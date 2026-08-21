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
    if (!text) continue;
    const key = (cols.number ? row.getCell(cols.number).text.trim() : '') || text;
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push({
      key,
      text,
      answers: cols.answers.map(c => cleanText(row.getCell(c).text)).filter(a => a && a !== '-'),
      correct: cleanText(row.getCell(cols.correct).text),
      time: cols.time ? parseFloat(row.getCell(cols.time).text) : 0,
    });
  }
  return questions;
}

const TRUE_LABELS = /^(true|verdadero)$/i;
const FALSE_LABELS = /^(false|falso)$/i;

function isTrueFalse(answers: string[]): boolean {
  return answers.length === 2 && answers.some(a => TRUE_LABELS.test(a)) && answers.some(a => FALSE_LABELS.test(a));
}

// "Correct Answers" viene como texto: puede ser una opción exacta o varias separadas por coma
function correctAnswers(correct: string, answers: string[]): string[] {
  if (!correct || correct === '-') return [];
  if (answers.some(a => a === correct)) return [correct];
  return correct
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function buildQuestion(raw: RawQuestion, result: ImportResult, position: number): QuizQuestionInput | null {
  const label = `Pregunta ${position}`;
  if (raw.answers.length < 2) {
    result.skipped.push(`${label} ("${raw.text}"): no es multiple choice ni verdadero/falso.`);
    return null;
  }
  const corrects = correctAnswers(raw.correct, raw.answers);
  if (corrects.length === 0) {
    result.skipped.push(`${label} ("${raw.text}"): no tiene respuesta correcta (encuesta o pregunta abierta).`);
    return null;
  }
  const matched = corrects.filter(c => raw.answers.includes(c));
  if (matched.length === 0) {
    result.skipped.push(`${label} ("${raw.text}"): no se pudo identificar la respuesta correcta.`);
    return null;
  }
  if (matched.length < corrects.length) {
    result.warnings.push(`${label}: alguna respuesta correcta del export no coincide con las opciones; revisá las marcadas.`);
  }

  const trueFalse = isTrueFalse(raw.answers);
  const options: QuizOptionInput[] = raw.answers.map(text => ({
    text: trueFalse ? (TRUE_LABELS.test(text) ? 'Verdadero' : 'Falso') : text,
    isCorrect: matched.includes(text),
  }));

  let type: QuizQuestionInput['type'];
  if (trueFalse) {
    type = 'true_false';
  } else {
    type = matched.length > 1 ? 'multi' : 'single';
    // El editor y el juego trabajan con 4 opciones fijas
    while (options.length < 4) options.push({ text: '', isCorrect: false });
    const missing = 4 - raw.answers.length;
    if (missing > 0) {
      result.warnings.push(`${label}: tenía ${raw.answers.length} opciones en Kahoot; ${missing === 1 ? 'completá la restante' : `completá las ${missing} restantes`}.`);
    } else if (raw.answers.length > 4) {
      options.length = 4;
      result.warnings.push(`${label}: tenía ${raw.answers.length} opciones en Kahoot y solo se importaron las primeras 4.`);
    }
    if (!options.some(o => o.isCorrect)) {
      result.skipped.push(`${label} ("${raw.text}"): la respuesta correcta quedó fuera de las primeras 4 opciones.`);
      return null;
    }
  }

  return { type, text: raw.text, imageUrl: null, timeLimit: mapTimeLimit(raw.time), options };
}

function quizName(workbook: Workbook, fallback: string): string {
  const overview = workbook.worksheets.find(ws => /^overview$/i.test(ws.name)) || workbook.worksheets[0];
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
  raws.forEach((raw, i) => {
    const question = buildQuestion(raw, result, i + 1);
    if (!question) return;
    if (raw.time && question.timeLimit !== raw.time) timeAdjusted++;
    result.quiz.questions.push(question);
  });
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
