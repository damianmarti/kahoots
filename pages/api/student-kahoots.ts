import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { cuatrimestre, padron } = req.query;
  if (!cuatrimestre || typeof cuatrimestre !== 'string' || !padron || typeof padron !== 'string') {
    return res.status(400).json({ error: 'Missing cuatrimestre or padron' });
  }
  try {
    const result = await pool.query(
      'SELECT kahoot_name, correct_answers, incorrect_answers FROM kahoot_results WHERE cuatrimestre = $1 AND padron = $2 ORDER BY kahoot_name',
      [cuatrimestre, padron]
    );
    const kahoots = result.rows.map((row: any) => {
      const total = row.correct_answers + row.incorrect_answers;
      const approved = total > 0 && (row.correct_answers / total) >= 0.6;
      return {
        kahoot_name: row.kahoot_name,
        correct_answers: row.correct_answers,
        incorrect_answers: row.incorrect_answers,
        approved,
      };
    });
    res.status(200).json({ kahoots });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}