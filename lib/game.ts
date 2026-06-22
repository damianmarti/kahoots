import crypto from 'crypto';
import { pool } from './db';

export const ANSWER_GRACE_MS = 1500;
// A player counts as "active" (blocks early question close) if seen in the last 10s
export const ACTIVE_WINDOW_MS = 10_000;

export function randomCode(length = 6): string {
  const alphabet = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789'; // sin O/0/1 para evitar confusiones
  let code = '';
  for (const byte of crypto.randomBytes(length)) code += alphabet[byte % alphabet.length];
  return code;
}

export function randomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function cuatrimestreNow(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1 <= 7 ? 1 : 2}`;
}

// fraction es la proporción de acierto (0..1): 1 = respuesta totalmente
// correcta, valores intermedios = crédito parcial (multiple choice con varias
// respuestas correctas). Los puntos siguen escalando con la velocidad.
export function computePoints(fraction: number, responseMs: number, timeLimitMs: number): number {
  if (fraction <= 0) return 0;
  const f = Math.min(fraction, 1);
  const t = Math.min(Math.max(responseMs, 0), timeLimitMs);
  return Math.round(1000 * f * (1 - t / timeLimitMs / 2));
}

// If the current question's time is up, move the game to 'reveal'.
// Race-safe: the WHERE status='question' guard lets only one caller win.
export async function maybeExpireQuestion(gameId: number): Promise<void> {
  await pool.query(
    `UPDATE games g SET status = 'reveal', question_ended_at = now()
     FROM questions q
     WHERE g.id = $1 AND g.status = 'question'
       AND q.quiz_id = g.quiz_id AND q.position = g.current_question_index
       AND now() > g.question_started_at + (q.time_limit || ' seconds')::interval`,
    [gameId],
  );
}

// If every active player answered the current question, move to 'reveal'.
export async function maybeCloseIfAllAnswered(gameId: number): Promise<void> {
  await pool.query(
    `UPDATE games g SET status = 'reveal', question_ended_at = now()
     FROM questions q
     WHERE g.id = $1 AND g.status = 'question'
       AND q.quiz_id = g.quiz_id AND q.position = g.current_question_index
       AND (SELECT COUNT(*) FROM game_answers a WHERE a.game_id = g.id AND a.question_id = q.id) > 0
       AND (SELECT COUNT(*) FROM game_answers a WHERE a.game_id = g.id AND a.question_id = q.id)
           >= (SELECT COUNT(*) FROM game_players p WHERE p.game_id = g.id
               AND p.last_seen_at > now() - ($2 || ' milliseconds')::interval)`,
    [gameId, ACTIVE_WINDOW_MS],
  );
}

export async function getLeaderboard(gameId: number, limit = 5) {
  const { rows } = await pool.query(
    `SELECT padron, nickname, score, RANK() OVER (ORDER BY score DESC) AS rank
     FROM game_players WHERE game_id = $1
     ORDER BY score DESC, joined_at ASC
     LIMIT $2`,
    [gameId, limit],
  );
  return rows.map(r => ({ padron: r.padron, nickname: r.nickname, score: r.score, rank: Number(r.rank) }));
}

// Game row + current question info + server-computed remaining time, in one query
export async function getGameState(gameId: number) {
  const { rows } = await pool.query(
    `SELECT g.id, g.code, g.quiz_id, g.status, g.current_question_index, g.started_by,
            qz.name AS quiz_name,
            (SELECT COUNT(*) FROM questions WHERE quiz_id = g.quiz_id)::int AS total_questions,
            q.id AS question_id, q.type AS question_type, q.text AS question_text,
            q.image_url, q.time_limit,
            GREATEST(0, CEIL(EXTRACT(EPOCH FROM (g.question_started_at + (q.time_limit || ' seconds')::interval - now())) * 1000))::int AS remaining_ms
     FROM games g
     JOIN quizzes qz ON qz.id = g.quiz_id
     LEFT JOIN questions q ON q.quiz_id = g.quiz_id AND q.position = g.current_question_index
     WHERE g.id = $1`,
    [gameId],
  );
  return rows[0] ?? null;
}
