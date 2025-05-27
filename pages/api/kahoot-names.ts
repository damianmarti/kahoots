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
      'SELECT DISTINCT kahoot_name FROM kahoot_results WHERE cuatrimestre = $1 ORDER BY kahoot_name',
      [cuatrimestre]
    );
    const kahootNames = result.rows.map((row) => row.kahoot_name);
    res.status(200).json({ kahootNames });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}