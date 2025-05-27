import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { cuatrimestre } = req.query;
  if (!cuatrimestre || typeof cuatrimestre !== 'string') {
    return res.status(400).json({ error: 'Missing cuatrimestre' });
  }
  try {
    const result = await pool.query(
      `SELECT DISTINCT k.padron, s.first_name, s.last_name
       FROM kahoot_results k
       LEFT JOIN students s ON k.padron = s.padron
       WHERE k.cuatrimestre = $1
       ORDER BY k.padron`,
      [cuatrimestre]
    );
    res.status(200).json({ students: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}