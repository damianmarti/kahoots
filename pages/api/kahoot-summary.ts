import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface KahootSummary {
  kahootName: string;
  totalStudents: number;
  totalApproved: number;
  totalReproved: number;
  percentApproved: number;
}

interface StudentSummary {
  padron: string;
  first_name?: string;
  last_name?: string;
  kahootsApproved: number;
  kahootsFailed: number;
  kahootsNotPlayed: number;
  percentApproved: number;
  approved: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { cuatrimestre } = req.query;
  if (!cuatrimestre || typeof cuatrimestre !== 'string') {
    return res.status(400).json({ error: 'Missing cuatrimestre' });
  }
  try {
    // Get all kahoot names for the cuatrimestre
    const kahootNamesResult = await pool.query(
      'SELECT DISTINCT kahoot_name FROM kahoot_results WHERE cuatrimestre = $1',
      [cuatrimestre]
    );
    const allKahootNames = kahootNamesResult.rows.map((row: any) => row.kahoot_name);
    const totalKahoots = allKahootNames.length;

    const result = await pool.query(
      `SELECT k.kahoot_name, k.padron, s.first_name, s.last_name, k.correct_answers, k.incorrect_answers
       FROM kahoot_results k
       LEFT JOIN students s ON k.padron = s.padron
       WHERE k.cuatrimestre = $1`,
      [cuatrimestre]
    );
    // Kahoot summary
    const kahootMap: Record<string, { correct: number; incorrect: number }[]> = {};
    for (const row of result.rows) {
      if (!kahootMap[row.kahoot_name]) kahootMap[row.kahoot_name] = [];
      kahootMap[row.kahoot_name].push({ correct: row.correct_answers, incorrect: row.incorrect_answers });
    }
    const summaries: KahootSummary[] = Object.entries(kahootMap).map(([kahootName, arr]) => {
      const totalStudents = arr.length;
      let totalApproved = 0;
      let totalReproved = 0;
      arr.forEach(({ correct, incorrect }) => {
        const total = correct + incorrect;
        const approved = total > 0 && (correct / total) >= 0.6;
        if (approved) totalApproved++;
        else totalReproved++;
      });
      const percentApproved = totalStudents > 0 ? Math.round((totalApproved / totalStudents) * 100) : 0;
      return {
        kahootName,
        totalStudents,
        totalApproved,
        totalReproved,
        percentApproved,
      };
    });
    // Student summary
    const studentMap: Record<string, { first_name?: string; last_name?: string; approved: number; failed: number; played: Set<string> }> = {};
    for (const row of result.rows) {
      const padron = row.padron;
      const correct = row.correct_answers;
      const incorrect = row.incorrect_answers;
      const total = correct + incorrect;
      const isApproved = total > 0 && (correct / total) >= 0.6;
      if (!studentMap[padron]) studentMap[padron] = { first_name: row.first_name, last_name: row.last_name, approved: 0, failed: 0, played: new Set() };
      if (isApproved) studentMap[padron].approved++;
      else studentMap[padron].failed++;
      studentMap[padron].played.add(row.kahoot_name);
    }
    const studentsSummary: StudentSummary[] = Object.entries(studentMap).map(([padron, stats]) => {
      const kahootsPlayed = stats.played.size;
      const kahootsNotPlayed = totalKahoots - kahootsPlayed;
      const percentApproved = totalKahoots > 0 ? Math.round((stats.approved / totalKahoots) * 100) : 0;
      return {
        padron,
        first_name: stats.first_name,
        last_name: stats.last_name,
        kahootsApproved: stats.approved,
        kahootsFailed: stats.failed,
        kahootsNotPlayed,
        percentApproved,
        approved: percentApproved >= 60,
      };
    });
    res.status(200).json({ summaries, studentsSummary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}