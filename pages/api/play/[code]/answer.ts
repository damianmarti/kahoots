import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';
import { maybeExpireQuestion, maybeCloseIfAllAnswered, computePoints, ANSWER_GRACE_MS } from '../../../../lib/game';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const code = ((req.query.code as string) || '').toUpperCase();
  const { token, questionId, selectedOptionIds } = req.body || {};
  if (!token || !questionId || !Array.isArray(selectedOptionIds) || selectedOptionIds.length === 0) {
    return res.status(400).json({ error: 'Faltan datos.' });
  }

  try {
    const {
      rows: [row],
    } = await pool.query(
      `SELECT p.id AS player_id, g.id AS game_id, g.status, g.current_question_index,
              q.id AS question_id, q.type, q.time_limit,
              EXTRACT(EPOCH FROM (now() - g.question_started_at)) * 1000 AS elapsed_ms
       FROM games g
       JOIN game_players p ON p.game_id = g.id AND p.session_token = $2
       LEFT JOIN questions q ON q.quiz_id = g.quiz_id AND q.position = g.current_question_index
       WHERE g.code = $1`,
      [code, token],
    );
    if (!row) return res.status(401).json({ kicked: true });
    if (row.status !== 'question' || row.question_id !== questionId) {
      return res.status(400).json({ error: 'La pregunta ya no está activa.' });
    }
    const timeLimitMs = row.time_limit * 1000;
    const elapsedMs = Math.round(Number(row.elapsed_ms));
    if (elapsedMs > timeLimitMs + ANSWER_GRACE_MS) {
      await maybeExpireQuestion(row.game_id);
      return res.status(400).json({ error: 'Tiempo agotado.' });
    }

    const { rows: options } = await pool.query('SELECT id, is_correct FROM question_options WHERE question_id = $1', [questionId]);
    const validIds = new Set(options.map(o => o.id));
    const selected: number[] = Array.from(new Set(selectedOptionIds.map((x: any) => parseInt(x, 10))));
    if (selected.some(id => !validIds.has(id))) return res.status(400).json({ error: 'Opción inválida.' });
    if (row.type !== 'multi' && selected.length !== 1) return res.status(400).json({ error: 'Debe elegir una sola opción.' });

    const correctIds = options.filter(o => o.is_correct).map(o => o.id);
    const isCorrect = selected.length === correctIds.length && correctIds.every(id => selected.includes(id));
    const points = computePoints(isCorrect, elapsedMs, timeLimitMs);

    const { rowCount } = await pool.query(
      `INSERT INTO game_answers (game_id, player_id, question_id, selected_options, is_correct, response_ms, points)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (player_id, question_id) DO NOTHING`,
      [row.game_id, row.player_id, questionId, selected, isCorrect, Math.min(elapsedMs, timeLimitMs), points],
    );
    if (rowCount === 0) return res.status(200).json({ alreadyAnswered: true });

    await pool.query('UPDATE game_players SET score = score + $2, last_seen_at = now() WHERE id = $1', [row.player_id, points]);
    await maybeCloseIfAllAnswered(row.game_id);

    // No se devuelve si fue correcta: el jugador lo ve recién en el reveal
    res.status(200).json({ answered: true });
  } catch (err: any) {
    console.error('play/answer error:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
