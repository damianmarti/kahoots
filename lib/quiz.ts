import type { PoolClient } from 'pg';

export const TIME_LIMITS = [30, 45, 60, 90, 120];

export interface QuizOptionInput {
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestionInput {
  type: 'true_false' | 'single' | 'multi';
  text: string;
  imageUrl?: string | null;
  timeLimit: number;
  options: QuizOptionInput[];
}

export interface QuizInput {
  name: string;
  questions: QuizQuestionInput[];
}

// Devuelve un mensaje de error o null si es válido
export function validateQuiz(quiz: any): string | null {
  if (!quiz || typeof quiz.name !== 'string' || !quiz.name.trim()) return 'Falta el nombre del cuestionario.';
  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) return 'El cuestionario debe tener al menos una pregunta.';
  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i];
    const n = `Pregunta ${i + 1}`;
    if (!q || typeof q.text !== 'string' || !q.text.trim()) return `${n}: falta el texto.`;
    if (!['true_false', 'single', 'multi'].includes(q.type)) return `${n}: tipo inválido.`;
    if (!TIME_LIMITS.includes(q.timeLimit)) return `${n}: tiempo inválido.`;
    if (!Array.isArray(q.options)) return `${n}: faltan opciones.`;
    const expected = q.type === 'true_false' ? 2 : 4;
    if (q.options.length !== expected) return `${n}: debe tener ${expected} opciones.`;
    if (q.options.some((o: any) => !o || typeof o.text !== 'string' || !o.text.trim())) return `${n}: hay opciones sin texto.`;
    const correct = q.options.filter((o: any) => o.isCorrect).length;
    if (q.type === 'multi') {
      if (correct < 1) return `${n}: debe tener al menos una opción correcta.`;
    } else if (correct !== 1) {
      return `${n}: debe tener exactamente una opción correcta.`;
    }
  }
  return null;
}

export async function insertQuestions(client: PoolClient, quizId: number, questions: QuizQuestionInput[]) {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const { rows } = await client.query(
      'INSERT INTO questions (quiz_id, position, type, text, image_url, time_limit) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [quizId, i, q.type, q.text.trim(), q.imageUrl || null, q.timeLimit]
    );
    for (let j = 0; j < q.options.length; j++) {
      await client.query(
        'INSERT INTO question_options (question_id, position, text, is_correct) VALUES ($1, $2, $3, $4)',
        [rows[0].id, j, q.options[j].text.trim(), !!q.options[j].isCorrect]
      );
    }
  }
}

// Carga un quiz completo en el formato que consume el editor
export async function loadQuiz(client: PoolClient, quizId: number) {
  const quiz = await client.query('SELECT id, name, created_by FROM quizzes WHERE id = $1', [quizId]);
  if (!quiz.rows[0]) return null;
  const { rows } = await client.query(
    `SELECT q.id, q.position, q.type, q.text, q.image_url, q.time_limit,
            json_agg(json_build_object('text', o.text, 'isCorrect', o.is_correct) ORDER BY o.position) AS options
     FROM questions q JOIN question_options o ON o.question_id = q.id
     WHERE q.quiz_id = $1
     GROUP BY q.id ORDER BY q.position`,
    [quizId]
  );
  return {
    id: quiz.rows[0].id,
    name: quiz.rows[0].name,
    questions: rows.map(q => ({
      type: q.type,
      text: q.text,
      imageUrl: q.image_url,
      timeLimit: q.time_limit,
      options: q.options,
    })),
  };
}
