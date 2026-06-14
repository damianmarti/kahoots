import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';
import { randomToken } from '../../../../lib/game';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const code = (req.query.code as string || '').toUpperCase();
  const padron = String(req.body?.padron || '').trim();
  const nickname = String(req.body?.nickname || '').trim().slice(0, 50);
  if (!/^\d{4,20}$/.test(padron)) return res.status(400).json({ error: 'El padrón debe ser numérico.' });
  if (!nickname) return res.status(400).json({ error: 'Falta el nickname.' });

  try {
    const { rows: [game] } = await pool.query('SELECT id, status FROM games WHERE code = $1', [code]);
    if (!game) return res.status(404).json({ error: 'No existe un juego con ese código.' });
    if (game.status === 'podium') return res.status(400).json({ error: 'El juego ya terminó.' });

    // Si el padrón ya está en el juego, rota el token: la sesión anterior queda
    // invalidada (kick) y este dispositivo pasa a ser el dueño, conservando el puntaje.
    const token = randomToken();
    await pool.query(
      `INSERT INTO game_players (game_id, padron, nickname, session_token)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (game_id, padron)
       DO UPDATE SET session_token = EXCLUDED.session_token, nickname = EXCLUDED.nickname, last_seen_at = now()`,
      [game.id, padron, nickname, token]
    );
    res.status(200).json({ playerToken: token, status: game.status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
