import { pool } from '../../../../lib/db';
import { withAdmin, audit } from '../../../../lib/auth';
import { randomCode } from '../../../../lib/game';

export default withAdmin(async (req, res, admin) => {
  if (req.method === 'GET') {
    const { rows } = await pool.query(
      `SELECT g.id, g.code, g.status, g.created_at, g.finished_at,
              qz.name AS quiz_name, u.username AS started_by_username,
              (SELECT COUNT(*) FROM game_players p WHERE p.game_id = g.id)::int AS player_count
       FROM games g
       JOIN quizzes qz ON qz.id = g.quiz_id
       JOIN admin_users u ON u.id = g.started_by
       ORDER BY g.id DESC`
    );
    return res.status(200).json({ games: rows });
  }
  if (req.method === 'POST') {
    const quizId = parseInt(req.body?.quizId, 10);
    if (!quizId) return res.status(400).json({ error: 'Falta el cuestionario.' });
    const { rows: questions } = await pool.query('SELECT 1 FROM questions WHERE quiz_id = $1 LIMIT 1', [quizId]);
    if (questions.length === 0) return res.status(400).json({ error: 'El cuestionario no tiene preguntas.' });
    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = randomCode();
        try {
          const { rows } = await pool.query(
            'INSERT INTO games (code, quiz_id, started_by) VALUES ($1, $2, $3) RETURNING id',
            [code, quizId, admin.id]
          );
          await audit(admin.id, 'game_start', 'game', rows[0].id, { quizId, code });
          return res.status(200).json({ gameId: rows[0].id, code, joinUrl: `/play/${code}` });
        } catch (err: any) {
          if (err.code !== '23505') throw err; // colisión de código: reintenta
        }
      }
      return res.status(500).json({ error: 'No se pudo generar un código único.' });
    } catch (err: any) {
      console.error('admin/games error:', err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
  res.status(405).json({ error: 'Method not allowed' });
});
