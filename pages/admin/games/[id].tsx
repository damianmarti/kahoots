import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSidePropsContext } from 'next';
import { requireAdminSSR, AdminSession } from '../../../lib/auth';

interface Report {
  game: { code: string; status: string; created_at: string; quiz_name: string; started_by_username: string };
  questions: { id: number; position: number; type: string; text: string; correctCount: number; answerCount: number; percentCorrect: number }[];
  players: {
    padron: string;
    nickname: string;
    firstName: string | null;
    lastName: string | null;
    score: number;
    rank: number;
    answers: ({ isCorrect: boolean; points: number; responseMs: number } | null)[];
  }[];
}

const GameReport: React.FC<{ admin: AdminSession }> = () => {
  const router = useRouter();
  const gameId = router.query.id as string;
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;
    fetch(`/api/admin/games/${gameId}/report`)
      .then(r => r.json())
      .then(d => (d.game ? setReport(d) : setError(d.error || 'No se pudo cargar el reporte.')))
      .catch(() => setError('No se pudo cargar el reporte.'));
  }, [gameId]);

  if (error) {
    return <div style={{ padding: 48, textAlign: 'center', color: '#d32f2f', fontWeight: 500 }}>{error}</div>;
  }
  if (!report) {
    return <div style={{ padding: 48, textAlign: 'center', color: '#666' }}>Cargando...</div>;
  }

  const { game, questions, players } = report;
  const sortedByCorrect = [...questions].sort((a, b) => b.percentCorrect - a.percentCorrect);

  return (
    <div style={{ minHeight: '80vh', background: '#f6f8fa', padding: '0 16px 48px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Link href="/admin/games" legacyBehavior>
          <a style={{ color: '#1976d2' }}>← Volver a juegos</a>
        </Link>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#1976d2', margin: '16px 0 4px' }}>{game.quiz_name}</h2>
        <div style={{ color: '#666', marginBottom: 24 }}>
          Código {game.code} · Iniciado por {game.started_by_username} · {new Date(game.created_at).toLocaleString('es-AR')} · {players.length} jugadores
        </div>

        <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Preguntas: mejores y peores</h3>
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 32 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f4f8', textAlign: 'left' }}>
                <th style={{ padding: '10px 16px' }}>#</th>
                <th style={{ padding: '10px 16px' }}>Pregunta</th>
                <th style={{ padding: '10px 16px' }}>Correctas</th>
                <th style={{ padding: '10px 16px' }}>% correctas</th>
              </tr>
            </thead>
            <tbody>
              {sortedByCorrect.map((q, i) => {
                const best = i === 0;
                const worst = i === sortedByCorrect.length - 1 && sortedByCorrect.length > 1;
                return (
                  <tr key={q.id} style={{ borderTop: '1px solid #eee', background: best ? '#e8f5e9' : worst ? '#ffebee' : undefined }}>
                    <td style={{ padding: '10px 16px', color: '#888' }}>{q.position + 1}</td>
                    <td style={{ padding: '10px 16px' }}>{q.text}</td>
                    <td style={{ padding: '10px 16px' }}>
                      {q.correctCount}/{players.length}
                    </td>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: q.percentCorrect >= 60 ? '#388e3c' : '#d32f2f' }}>
                      {q.percentCorrect}% {best ? '👍' : worst ? '👎' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Jugadores</h3>
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f4f8', textAlign: 'left' }}>
                <th style={{ padding: '10px 16px' }}>#</th>
                <th style={{ padding: '10px 16px' }}>Padrón</th>
                <th style={{ padding: '10px 16px' }}>Nickname</th>
                <th style={{ padding: '10px 16px' }}>Alumno</th>
                <th style={{ padding: '10px 16px' }}>Puntaje</th>
                {questions.map(q => (
                  <th key={q.id} title={q.text} style={{ padding: '10px 8px', textAlign: 'center' }}>
                    P{q.position + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map(p => (
                <tr key={p.padron} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 700 }}>{p.rank}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <Link href={`/student-summary?padron=${p.padron}`} legacyBehavior>
                      <a style={{ color: '#1976d2' }}>{p.padron}</a>
                    </Link>
                  </td>
                  <td style={{ padding: '10px 16px' }}>{p.nickname}</td>
                  <td style={{ padding: '10px 16px', color: p.lastName ? undefined : '#bbb' }}>{p.lastName ? `${p.lastName}, ${p.firstName}` : 'no registrado'}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 700, color: '#1976d2' }}>{p.score}</td>
                  {p.answers.map((a, i) => (
                    <td key={i} title={a ? `${a.points} pts · ${(a.responseMs / 1000).toFixed(1)}s` : 'No respondió'} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 17 }}>
                      {a === null ? (
                        <span style={{ color: '#bbb' }}>—</span>
                      ) : a.isCorrect ? (
                        <span style={{ color: '#388e3c', fontWeight: 700 }}>✓</span>
                      ) : (
                        <span style={{ color: '#d32f2f', fontWeight: 700 }}>✗</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAdminSSR(ctx);
}

export default GameReport;
