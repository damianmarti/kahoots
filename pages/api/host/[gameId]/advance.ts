import { pool } from '../../../../lib/db';
import { withAdmin } from '../../../../lib/auth';
import { cuatrimestreNow } from '../../../../lib/game';

// Transiciones del juego, todas con guard WHERE status = <esperado> (idempotentes):
// lobby -> title -> question -> reveal -> (leaderboard -> question)* -> podium
export default withAdmin(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const gameId = parseInt(req.query.gameId as string, 10);
  const from = req.body?.from;
  if (!gameId || !from) return res.status(400).json({ error: 'Faltan datos.' });

  try {
    if (from === 'lobby') {
      const { rows } = await pool.query(
        `UPDATE games SET status = 'title' WHERE id = $1 AND status = 'lobby'
           AND EXISTS (SELECT 1 FROM game_players WHERE game_id = $1)
         RETURNING id`,
        [gameId]
      );
      if (!rows[0]) return res.status(409).json({ error: 'No se puede iniciar: no hay jugadores o el juego ya empezó.' });
      return res.status(200).json({ status: 'title' });
    }

    if (from === 'title') {
      await pool.query(
        `UPDATE games SET status = 'question', current_question_index = 0, question_started_at = now(), question_ended_at = NULL
         WHERE id = $1 AND status = 'title'`,
        [gameId]
      );
      return res.status(200).json({ status: 'question' });
    }

    if (from === 'leaderboard') {
      await pool.query(
        `UPDATE games SET status = 'question', current_question_index = current_question_index + 1,
                question_started_at = now(), question_ended_at = NULL
         WHERE id = $1 AND status = 'leaderboard'`,
        [gameId]
      );
      return res.status(200).json({ status: 'question' });
    }

    if (from === 'reveal') {
      const { rows: [game] } = await pool.query(
        `SELECT g.current_question_index,
                (SELECT COUNT(*) FROM questions WHERE quiz_id = g.quiz_id)::int AS total
         FROM games g WHERE g.id = $1`,
        [gameId]
      );
      if (!game) return res.status(404).json({ error: 'Juego no encontrado.' });
      const isLast = game.current_question_index >= game.total - 1;

      if (!isLast) {
        await pool.query(`UPDATE games SET status = 'leaderboard' WHERE id = $1 AND status = 'reveal'`, [gameId]);
        return res.status(200).json({ status: 'leaderboard' });
      }

      // Última pregunta: pasa a podium y persiste los resultados en kahoot_results
      // en la misma transacción. El guard WHERE status='reveal' asegura que corre una sola vez.
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          `UPDATE games SET status = 'podium', finished_at = now() WHERE id = $1 AND status = 'reveal' RETURNING quiz_id`,
          [gameId]
        );
        if (rows[0]) {
          await client.query(
            `INSERT INTO kahoot_results (kahoot_name, cuatrimestre, padron, correct_answers, incorrect_answers)
             SELECT qz.name, $2, p.padron,
                    COUNT(a.id) FILTER (WHERE a.is_correct)::int,
                    ((SELECT COUNT(*) FROM questions WHERE quiz_id = qz.id) - COUNT(a.id) FILTER (WHERE a.is_correct))::int
             FROM game_players p
             JOIN games g ON g.id = p.game_id
             JOIN quizzes qz ON qz.id = g.quiz_id
             LEFT JOIN game_answers a ON a.player_id = p.id
             WHERE p.game_id = $1
             GROUP BY qz.id, qz.name, p.padron`,
            [gameId, cuatrimestreNow()]
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
      return res.status(200).json({ status: 'podium' });
    }

    return res.status(400).json({ error: `Transición inválida desde "${from}".` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
