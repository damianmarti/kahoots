import { pool } from '../../../../../lib/db';
import { withAdmin } from '../../../../../lib/auth';

export default withAdmin(async (req, res) => {
  const gameId = parseInt(req.query.id as string, 10);
  if (!gameId) return res.status(400).json({ error: 'Id inválido.' });

  const { rows: [game] } = await pool.query(
    `SELECT g.id, g.code, g.status, g.created_at, g.finished_at,
            qz.name AS quiz_name, u.username AS started_by_username
     FROM games g JOIN quizzes qz ON qz.id = g.quiz_id JOIN admin_users u ON u.id = g.started_by
     WHERE g.id = $1`,
    [gameId]
  );
  if (!game) return res.status(404).json({ error: 'Juego no encontrado.' });

  const { rows: questions } = await pool.query(
    `SELECT q.id, q.position, q.type, q.text,
            (SELECT COUNT(*) FROM game_answers a WHERE a.game_id = $1 AND a.question_id = q.id AND a.is_correct)::int AS correct_count,
            (SELECT COUNT(*) FROM game_answers a WHERE a.game_id = $1 AND a.question_id = q.id)::int AS answer_count
     FROM questions q
     JOIN games g ON g.quiz_id = q.quiz_id
     WHERE g.id = $1
     ORDER BY q.position`,
    [gameId]
  );

  const { rows: players } = await pool.query(
    `SELECT p.id, p.padron, p.nickname, p.score, s.first_name, s.last_name,
            RANK() OVER (ORDER BY p.score DESC) AS rank
     FROM game_players p LEFT JOIN students s ON s.padron = p.padron
     WHERE p.game_id = $1
     ORDER BY p.score DESC, p.joined_at`,
    [gameId]
  );

  const { rows: answers } = await pool.query(
    'SELECT player_id, question_id, is_correct, points, response_ms FROM game_answers WHERE game_id = $1',
    [gameId]
  );
  const byPlayer = new Map<number, Map<number, any>>();
  for (const a of answers) {
    if (!byPlayer.has(a.player_id)) byPlayer.set(a.player_id, new Map());
    byPlayer.get(a.player_id)!.set(a.question_id, a);
  }

  const playerCount = players.length;
  res.status(200).json({
    game,
    questions: questions.map(q => ({
      id: q.id,
      position: q.position,
      type: q.type,
      text: q.text,
      correctCount: q.correct_count,
      answerCount: q.answer_count,
      percentCorrect: playerCount > 0 ? Math.round((q.correct_count / playerCount) * 100) : 0,
    })),
    players: players.map(p => ({
      padron: p.padron,
      nickname: p.nickname,
      firstName: p.first_name,
      lastName: p.last_name,
      score: p.score,
      rank: Number(p.rank),
      // por pregunta: true (correcta), false (incorrecta), null (no respondió)
      answers: questions.map(q => {
        const a = byPlayer.get(p.id)?.get(q.id);
        return a ? { isCorrect: a.is_correct, points: a.points, responseMs: a.response_ms } : null;
      }),
    })),
  });
});
