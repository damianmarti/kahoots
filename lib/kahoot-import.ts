import type { Workbook, Worksheet } from 'exceljs';
import { TIME_LIMITS, QuizInput, QuizQuestionInput, QuizOptionInput } from './quiz';

// Errores con mensaje pensado para mostrarle al admin
export class KahootImportError extends Error {}

export interface ImportResult {
  quiz: QuizInput;
  // Preguntas importadas que necesitan retoques (opciones faltantes, etc.)
  warnings: string[];
  // Preguntas del export que no se pudieron importar (encuestas, nube de palabras, ...)
  skipped: string[];
}

const HEADER_ALIASES = {
  number: /^question\s*number$/i,
  text: /^question$/i,
  answer: /^answer\s*(\d+)$/i,
  correct: /^correct\s*answers?$/i,
  time: /^time\s*allotted/i,
};

// Kahoot guarda el enunciado con HTML (<b>, <i>, ...) y entidades
export function cleanText(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// Los tiempos de Kahoot (5, 10, 20, 240, ...) no coinciden con los nuestros:
// se toma el menor de los permitidos que no recorte el tiempo original.
export function mapTimeLimit(seconds: number): number {
  if (!seconds || !isFinite(seconds)) return TIME_LIMITS[0];
  return TIME_LIMITS.find(t => t >= seconds) ?? TIME_LIMITS[TIME_LIMITS.length - 1];
}

function findRawSheet(workbook: Workbook): Worksheet | null {
  // "Raw Report Data" en los exports nuevos, "RawReportData Data" en los viejos
  return workbook.worksheets.find(ws => /raw\s*report\s*data/i.test(ws.name)) || null;
}

interface RawColumns {
  number: number;
  text: number;
  answers: number[];
  correct: number;
  time: number;
}

function findHeader(sheet: Worksheet): { row: number; cols: RawColumns } | null {
  const lastRow = Math.min(sheet.rowCount, 10);
  for (let r = 1; r <= lastRow; r++) {
    const row = sheet.getRow(r);
    const cols: RawColumns = { number: 0, text: 0, answers: [], correct: 0, time: 0 };
    for (let c = 1; c <= row.cellCount; c++) {
      const header = row.getCell(c).text.trim();
      if (!header) continue;
      if (HEADER_ALIASES.number.test(header)) cols.number = cols.number || c;
      else if (HEADER_ALIASES.text.test(header)) cols.text = cols.text || c;
      else if (HEADER_ALIASES.answer.test(header)) cols.answers.push(c);
      else if (HEADER_ALIASES.correct.test(header)) cols.correct = cols.correct || c;
      else if (HEADER_ALIASES.time.test(header)) cols.time = cols.time || c;
    }
    if (cols.text && cols.correct && cols.answers.length >= 2) return { row: r, cols };
  }
  return null;
}

interface RawQuestion {
  key: string;
  text: string;
  answers: string[];
  correct: string;
  time: number;
}

// El export trae una fila por jugador y pregunta: alcanza con la primera de cada pregunta
function readQuestions(sheet: Worksheet, header: { row: number; cols: RawColumns }): RawQuestion[] {
  const { cols } = header;
  const questions: RawQuestion[] = [];
  const seen = new Set<string>();
  for (let r = header.row + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const text = cleanText(row.getCell(cols.text).text);
    const answers = cols.answers.map(c => cleanText(row.getCell(c).text)).filter(a => a && a !== '-');
    const correct = cleanText(row.getCell(cols.correct).text);
    if (!text && answers.length === 0) continue; // fila vacía o separadora
    // Sin columna de número hay que deduplicar por contenido: dos preguntas con
    // el mismo enunciado siguen siendo distintas si cambian sus respuestas.
    const key = (cols.number ? row.getCell(cols.number).text.trim() : '') || [text, ...answers, correct].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push({ key, text, answers, correct, time: cols.time ? parseFloat(row.getCell(cols.time).text) : 0 });
  }
  return questions;
}

const TRUE_LABELS = /^(true|verdadero)$/i;
const FALSE_LABELS = /^(false|falso)$/i;

function isTrueFalse(answers: string[]): boolean {
  return answers.length === 2 && answers.some(a => TRUE_LABELS.test(a)) && answers.some(a => FALSE_LABELS.test(a));
}

// Kahoot une las respuestas correctas con comas, pero el texto de una opción
// también puede tenerlas: se intenta reconstruir la lista con las opciones
// reales y recién ahí se cae al split por comas.
function matchOptionSequence(correct: string, answers: string[]): string[] | null {
  const longestFirst = [...answers].sort((a, b) => b.length - a.length);
  const found: string[] = [];
  let rest = correct;
  while (rest) {
    const option = longestFirst.find(a => rest.startsWith(a));
    if (!option) return null;
    found.push(option);
    rest = rest.slice(option.length);
    if (!rest) break;
    const separator = rest.match(/^\s*,\s*/);
    if (!separator) return null;
    rest = rest.slice(separator[0].length);
  }
  return found.length > 0 ? found : null;
}

// "Correct Answers" viene como texto: una opción exacta o varias unidas por comas
function correctAnswers(correct: string, answers: string[]): string[] {
  if (!correct || correct === '-') return [];
  if (answers.some(a => a === correct)) return [correct];
  return (
    matchOptionSequence(correct, answers) ||
    correct
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  );
}

// Enunciados largos: se recortan para los mensajes al admin
function quote(text: string): string {
  return `"${text.length > 80 ? `${text.slice(0, 77)}...` : text}"`;
}

// Los avisos salen sin numerar: la posición final la pone parseKahootWorkbook,
// que es el que sabe cuántas preguntas anteriores se saltearon.
type BuildResult = { question: QuizQuestionInput; warnings: string[] } | { skipped: string };

function buildQuestion(raw: RawQuestion): BuildResult {
  if (!raw.text) return { skipped: 'una pregunta sin enunciado (¿era solo una imagen?).' };
  if (raw.answers.length < 2) return { skipped: `${quote(raw.text)}: no es multiple choice ni verdadero/falso.` };

  const warnings: string[] = [];
  const corrects = correctAnswers(raw.correct, raw.answers);
  if (corrects.length === 0) {
    return { skipped: `${quote(raw.text)}: no tiene respuesta correcta (encuesta o pregunta abierta).` };
  }
  // Se marca por posición: si dos opciones comparten texto, solo se marca la primera libre
  const correctIdx = new Set<number>();
  let unmatched = 0;
  for (const text of corrects) {
    const idx = raw.answers.findIndex((a, i) => a === text && !correctIdx.has(i));
    if (idx === -1) unmatched++;
    else correctIdx.add(idx);
  }
  if (correctIdx.size === 0) return { skipped: `${quote(raw.text)}: no se pudo identificar la respuesta correcta.` };
  if (unmatched > 0) warnings.push('alguna respuesta correcta del export no coincide con las opciones; revisá las marcadas.');

  const trueFalse = isTrueFalse(raw.answers);
  const options: QuizOptionInput[] = raw.answers.map((text, i) => ({
    text: trueFalse ? (TRUE_LABELS.test(text) ? 'Verdadero' : 'Falso') : text,
    isCorrect: correctIdx.has(i),
  }));

  let type: QuizQuestionInput['type'];
  if (trueFalse) {
    type = 'true_false';
  } else {
    type = correctIdx.size > 1 ? 'multi' : 'single';
    // El editor y el juego trabajan con 4 opciones fijas
    if (options.length > 4) {
      if ([...correctIdx].some(i => i >= 4)) {
        return { skipped: `${quote(raw.text)}: la respuesta correcta quedó fuera de las primeras 4 opciones.` };
      }
      warnings.push(`tenía ${options.length} opciones en Kahoot y solo se importaron las primeras 4.`);
      options.length = 4;
    } else if (options.length < 4) {
      const missing = 4 - options.length;
      warnings.push(`tenía ${options.length} opciones en Kahoot; ${missing === 1 ? 'completá la restante' : `completá las ${missing} restantes`}.`);
      while (options.length < 4) options.push({ text: '', isCorrect: false });
    }
  }

  return { question: { type, text: raw.text, imageUrl: null, timeLimit: mapTimeLimit(raw.time), options }, warnings };
}

// El título del kahoot está en A1 de la hoja "Overview"; sin esa hoja no hay
// dónde buscarlo (A1 de cualquier otra es un encabezado de columna)
function quizName(workbook: Workbook, fallback: string): string {
  const overview = workbook.worksheets.find(ws => /^overview$/i.test(ws.name));
  const title = overview ? cleanText(overview.getRow(1).getCell(1).text) : '';
  return title || fallback;
}

// Convierte un export de resultados de Kahoot (.xlsx) en un cuestionario editable
export function parseKahootWorkbook(workbook: Workbook, fallbackName: string): ImportResult {
  const sheet = findRawSheet(workbook);
  if (!sheet) throw new KahootImportError('El archivo no parece un export de Kahoot: falta la hoja "Raw Report Data".');
  const header = findHeader(sheet);
  if (!header) throw new KahootImportError('No se pudo leer la hoja "Raw Report Data": faltan las columnas de preguntas y respuestas.');

  const result: ImportResult = { quiz: { name: quizName(workbook, fallbackName), questions: [] }, warnings: [], skipped: [] };
  const raws = readQuestions(sheet, header);
  if (raws.length === 0) throw new KahootImportError('No se encontraron preguntas en el archivo.');
  let timeAdjusted = 0;
  for (const raw of raws) {
    const built = buildQuestion(raw);
    if ('skipped' in built) {
      result.skipped.push(built.skipped);
      continue;
    }
    // La numeración es la que va a ver el admin en el editor, sin las salteadas
    const label = `Pregunta ${result.quiz.questions.length + 1}`;
    for (const warning of built.warnings) result.warnings.push(`${label}: ${warning}`);
    if (raw.time && built.question.timeLimit !== raw.time) timeAdjusted++;
    result.quiz.questions.push(built.question);
  }
  if (timeAdjusted > 0) {
    result.warnings.push(
      timeAdjusted === 1
        ? 'El tiempo de 1 pregunta se ajustó al valor permitido más cercano.'
        : `El tiempo de ${timeAdjusted} preguntas se ajustó al valor permitido más cercano.`,
    );
  }
  if (result.quiz.questions.length === 0) throw new KahootImportError('No se pudo importar ninguna pregunta del archivo.');
  return result;
}
