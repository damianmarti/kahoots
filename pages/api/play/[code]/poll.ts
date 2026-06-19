import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';
import { maybeExpireQuestion, getGameState, getLeaderboard } from '../../../../lib/game';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = ((req.query.code as string) || '').toUpperCase();
  // El token va en el header Authorization (no en el querystring) para evitar
  // que un token bearer se filtre por logs, CDN, analítica o headers Referer.
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ kicked: true });

  try {
    const {
      rows: [player],
    } = await pool.query(
      `SELECT p.id, p.padron, p.nickname, p.score, g.id AS game_id
       FROM games g JOIN game_players p ON p.game_id = g.id AND p.session_token = $2
       WHERE g.code = $1`,
      [code, token],
    );
    if (!player) {
      // El token ya no coincide: otro dispositivo entró con el mismo padrón (o el juego no existe)
      return res.status(401).json({ kicked: true });
    }
    await pool.query('UPDATE game_players SET last_seen_at = now() WHERE id = $1', [player.id]);
    await maybeExpireQuestion(player.game_id);

    const game = await getGameState(player.game_id);
    if (!game) return res.status(404).json({ error: 'Juego no encontrado.' });
    const base = {
      status: game.status,
      quizName: game.quiz_name,
      questionIndex: game.current_question_index,
      totalQuestions: game.total_questions,
      nickname: player.nickname,
      score: player.score,
    };

    if (game.status === 'lobby') {
      const {
        rows: [c],
      } = await pool.query('SELECT COUNT(*)::int AS n FROM game_players WHERE game_id = $1', [player.game_id]);
      return res.status(200).json({ ...base, playerCount: c.n });
    }

    if (game.status === 'question') {
      const { rows: options } = await pool.query('SELECT id, text FROM question_options WHERE question_id = $1 ORDER BY position', [game.question_id]);
      const {
        rows: [answer],
      } = await pool.query('SELECT 1 FROM game_answers WHERE player_id = $1 AND question_id = $2', [player.id, game.question_id]);
      return res.status(200).json({
        ...base,
        question: {
          id: game.question_id,
          type: game.question_type,
          text: game.question_text,
          imageUrl: game.image_url,
          timeLimit: game.time_limit,
        },
        options,
        remainingMs: game.remaining_ms,
        alreadyAnswered: !!answer,
      });
    }

    if (game.status === 'reveal') {
      const { rows: correct } = await pool.query('SELECT id FROM question_options WHERE question_id = $1 AND is_correct ORDER BY position', [game.question_id]);
      const {
        rows: [answer],
      } = await pool.query('SELECT is_correct, points, selected_options FROM game_answers WHERE player_id = $1 AND question_id = $2', [player.id, game.question_id]);
      return res.status(200).json({
        ...base,
        question: { id: game.question_id, type: game.question_type, text: game.question_text },
        correctOptionIds: correct.map(r => r.id),
        yourAnswer: answer ? { isCorrect: answer.is_correct, points: answer.points, selectedOptionIds: answer.selected_options } : null,
      });
    }

    if (game.status === 'leaderboard' || game.status === 'podium') {
      const leaderboard = await getLeaderboard(player.game_id, game.status === 'podium' ? 3 : 5);
      const {
        rows: [me],
      } = await pool.query(
        `SELECT score, rank FROM (
           SELECT id, score, RANK() OVER (ORDER BY score DESC) AS rank FROM game_players WHERE game_id = $1
         ) r WHERE id = $2`,
        [player.game_id, player.id],
      );
      return res.status(200).json({
        ...base,
        leaderboard,
        yourScore: me.score,
        yourRank: Number(me.rank),
      });
    }

    // title
    return res.status(200).json(base);
  } catch (err: any) {
    console.error('play/poll error:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
