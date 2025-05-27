import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { cuatrimestre, kahootName } = req.query;
  if (!cuatrimestre || typeof cuatrimestre !== 'string' || !kahootName || typeof kahootName !== 'string') {
    return res.status(400).json({ error: 'Missing cuatrimestre or kahootName' });
  }
  try {
    const result = await pool.query(
      `SELECT k.padron, s.first_name, s.last_name, k.correct_answers, k.incorrect_answers
       FROM kahoot_results k
       LEFT JOIN students s ON k.padron = s.padron
       WHERE k.cuatrimestre = $1 AND k.kahoot_name = $2
       ORDER BY k.padron`,
      [cuatrimestre, kahootName]
    );
    res.status(200).json({ results: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}