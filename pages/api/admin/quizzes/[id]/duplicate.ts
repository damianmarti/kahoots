import { pool } from '../../../../../lib/db';
import { withAdmin, audit } from '../../../../../lib/auth';
import { loadQuiz, insertQuestions } from '../../../../../lib/quiz';

export default withAdmin(async (req, res, admin) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const quizId = parseInt(req.query.id as string, 10);
  if (!quizId) return res.status(400).json({ error: 'Id inválido.' });
  const client = await pool.connect();
  try {
    const quiz = await loadQuiz(client, quizId);
    if (!quiz) return res.status(404).json({ error: 'Cuestionario no encontrado.' });
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO quizzes (name, created_by) VALUES ($1, $2) RETURNING id',
      [`${quiz.name} (copia)`, admin.id]
    );
    await insertQuestions(client, rows[0].id, quiz.questions);
    await client.query('COMMIT');
    await audit(admin.id, 'quiz_duplicate', 'quiz', rows[0].id, { from: quizId, name: `${quiz.name} (copia)` });
    res.status(200).json({ id: rows[0].id });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});
