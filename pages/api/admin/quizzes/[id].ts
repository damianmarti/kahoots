import { pool } from '../../../../lib/db';
import { withAdmin, audit } from '../../../../lib/auth';
import { validateQuiz, insertQuestions, loadQuiz } from '../../../../lib/quiz';

export default withAdmin(async (req, res, admin) => {
  const quizId = parseInt(req.query.id as string, 10);
  if (!quizId) return res.status(400).json({ error: 'Id inválido.' });

  if (req.method === 'GET') {
    const client = await pool.connect();
    try {
      const quiz = await loadQuiz(client, quizId);
      if (!quiz) return res.status(404).json({ error: 'Cuestionario no encontrado.' });
      return res.status(200).json({ quiz });
    } finally {
      client.release();
    }
  }

  if (req.method === 'PUT' || req.method === 'DELETE') {
    const { rows: games } = await pool.query('SELECT 1 FROM games WHERE quiz_id = $1 LIMIT 1', [quizId]);
    if (games.length > 0) {
      return res.status(409).json({ error: 'Este cuestionario ya fue jugado: duplicalo para editarlo.' });
    }
  }

  if (req.method === 'PUT') {
    const error = validateQuiz(req.body);
    if (error) return res.status(400).json({ error });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('UPDATE quizzes SET name = $1, updated_at = now() WHERE id = $2 RETURNING id', [req.body.name.trim(), quizId]);
      if (!rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Cuestionario no encontrado.' });
      }
      await client.query('DELETE FROM questions WHERE quiz_id = $1', [quizId]);
      await insertQuestions(client, quizId, req.body.questions);
      await client.query('COMMIT');
      await audit(admin.id, 'quiz_update', 'quiz', quizId, { name: req.body.name.trim() });
      return res.status(200).json({ id: quizId });
    } catch (err: any) {
      await client.query('ROLLBACK').catch(rbErr => console.error('rollback failed:', rbErr));
      console.error('admin/quizzes/[id] error:', err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    } finally {
      client.release();
    }
  }

  if (req.method === 'DELETE') {
    const { rows } = await pool.query('DELETE FROM quizzes WHERE id = $1 RETURNING name', [quizId]);
    if (!rows[0]) return res.status(404).json({ error: 'Cuestionario no encontrado.' });
    await audit(admin.id, 'quiz_delete', 'quiz', quizId, { name: rows[0].name });
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
});
