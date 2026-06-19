import { pool } from '../../../../lib/db';
import { withAdmin } from '../../../../lib/auth';
import { maybeExpireQuestion, maybeCloseIfAllAnswered, getGameState, getLeaderboard, ACTIVE_WINDOW_MS } from '../../../../lib/game';

export default withAdmin(async (req, res) => {
  const gameId = parseInt(req.query.gameId as string, 10);
  if (!gameId) return res.status(400).json({ error: 'Id inválido.' });

  await maybeExpireQuestion(gameId);
  await maybeCloseIfAllAnswered(gameId);

  const game = await getGameState(gameId);
  if (!game) return res.status(404).json({ error: 'Juego no encontrado.' });

  const base = {
    status: game.status,
    code: game.code,
    quizName: game.quiz_name,
    questionIndex: game.current_question_index,
    totalQuestions: game.total_questions,
  };

  if (game.status === 'lobby') {
    const { rows: players } = await pool.query('SELECT padron, nickname FROM game_players WHERE game_id = $1 ORDER BY joined_at', [gameId]);
    return res.status(200).json({ ...base, players });
  }

  if (game.status === 'question' || game.status === 'reveal') {
    const { rows: options } = await pool.query(
      `SELECT o.id, o.text, o.is_correct,
              (SELECT COUNT(*) FROM game_answers a WHERE a.game_id = $2 AND a.question_id = o.question_id AND o.id = ANY(a.selected_options))::int AS answer_count
       FROM question_options o WHERE o.question_id = $1 ORDER BY o.position`,
      [game.question_id, gameId],
    );
    const {
      rows: [counts],
    } = await pool.query(
      `SELECT (SELECT COUNT(*) FROM game_answers a WHERE a.game_id = $1 AND a.question_id = $2)::int AS answered,
              (SELECT COUNT(*) FROM game_players p WHERE p.game_id = $1
                 AND p.last_seen_at > now() - ($3 || ' milliseconds')::interval)::int AS active,
              (SELECT COUNT(*) FROM game_players p WHERE p.game_id = $1)::int AS total`,
      [gameId, game.question_id, ACTIVE_WINDOW_MS],
    );
    return res.status(200).json({
      ...base,
      question: {
        id: game.question_id,
        type: game.question_type,
        text: game.question_text,
        imageUrl: game.image_url,
        timeLimit: game.time_limit,
      },
      options: options.map(o => ({
        id: o.id,
        text: o.text,
        // is_correct solo se muestra en reveal, pero el host es el admin: lo mandamos siempre
        isCorrect: o.is_correct,
        answerCount: game.status === 'reveal' ? o.answer_count : undefined,
      })),
      remainingMs: game.status === 'question' ? game.remaining_ms : 0,
      answeredCount: counts.answered,
      activeCount: counts.active,
      playerCount: counts.total,
    });
  }

  if (game.status === 'leaderboard' || game.status === 'podium') {
    const leaderboard = await getLeaderboard(gameId, game.status === 'podium' ? 1000 : 5);
    return res.status(200).json({ ...base, leaderboard });
  }

  // title
  return res.status(200).json(base);
});
