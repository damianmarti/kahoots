import { pool } from '../../../../lib/db';
import { withAdmin, audit } from '../../../../lib/auth';
import { validateQuiz, insertQuestions } from '../../../../lib/quiz';

export default withAdmin(async (req, res, admin) => {
  if (req.method === 'GET') {
    const { rows } = await pool.query(
      `SELECT z.id, z.name, u.username AS created_by_username,
              (SELECT COUNT(*) FROM questions q WHERE q.quiz_id = z.id)::int AS question_count,
              EXISTS (SELECT 1 FROM games g WHERE g.quiz_id = z.id) AS has_games
       FROM quizzes z JOIN admin_users u ON u.id = z.created_by
       ORDER BY z.id DESC`,
    );
    return res.status(200).json({ quizzes: rows });
  }
  if (req.method === 'POST') {
    const error = validateQuiz(req.body);
    if (error) return res.status(400).json({ error });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('INSERT INTO quizzes (name, created_by) VALUES ($1, $2) RETURNING id', [req.body.name.trim(), admin.id]);
      await insertQuestions(client, rows[0].id, req.body.questions);
      await client.query('COMMIT');
      await audit(admin.id, 'quiz_create', 'quiz', rows[0].id, { name: req.body.name.trim() });
      return res.status(200).json({ id: rows[0].id });
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('admin/quizzes error:', err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    } finally {
      client.release();
    }
  }
  res.status(405).json({ error: 'Method not allowed' });
});
