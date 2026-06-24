import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSidePropsContext } from 'next';
import { requireAdminSSR, AdminSession } from '../../lib/auth';

interface QuizRow {
  id: number;
  name: string;
  question_count: number;
  created_by_username: string;
  has_games: boolean;
}

const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '7px 14px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  marginRight: 8,
});

const AdminDashboard: React.FC<{ admin: AdminSession }> = () => {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuizzes = () => {
    fetch('/api/admin/quizzes')
      .then(res => res.json())
      .then(data => setQuizzes(data.quizzes || []))
      .catch(() => setError('No se pudieron cargar los cuestionarios.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadQuizzes, []);

  const startGame = async (quizId: number) => {
    const res = await fetch('/api/admin/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/host/${data.gameId}`);
    else setError(data.error || 'No se pudo iniciar el juego.');
  };

  const duplicateQuiz = async (quizId: number) => {
    const res = await fetch(`/api/admin/quizzes/${quizId}/duplicate`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) router.push(`/admin/quizzes/${data.id}`);
    else setError(data.error || 'No se pudo duplicar.');
  };

  return (
    <div style={{ minHeight: '80vh', background: '#f6f8fa', padding: '0 16px 48px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#1976d2' }}>Cuestionarios</h2>
          <Link href="/admin/quizzes/new" legacyBehavior>
            <a style={{ ...btnStyle('#1976d2'), textDecoration: 'none', display: 'inline-block', marginRight: 0 }}>+ Nuevo cuestionario</a>
          </Link>
        </div>

        {error && <div style={{ color: '#d32f2f', background: '#ffebee', borderRadius: 6, padding: '10px 18px', fontWeight: 500, marginBottom: 18 }}>{error}</div>}

        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>Cargando...</div>
          ) : quizzes.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>No hay cuestionarios todavía. Creá el primero con &quot;+ Nuevo cuestionario&quot;.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f4f8', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Nombre</th>
                  <th style={{ padding: '12px 16px' }}>Preguntas</th>
                  <th style={{ padding: '12px 16px' }}>Creado por</th>
                  <th style={{ padding: '12px 16px' }}></th>
                </tr>
              </thead>
              <tbody>
                {quizzes.map(q => (
                  <tr key={q.id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{q.name}</td>
                    <td style={{ padding: '12px 16px' }}>{q.question_count}</td>
                    <td style={{ padding: '12px 16px' }}>{q.created_by_username}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => startGame(q.id)} style={btnStyle('#388e3c')}>
                        Jugar
                      </button>
                      {q.has_games ? (
                        <button onClick={() => duplicateQuiz(q.id)} title="Ya fue jugado: se duplica para editar" style={btnStyle('#f57c00')}>
                          Duplicar para editar
                        </button>
                      ) : (
                        <button onClick={() => router.push(`/admin/quizzes/${q.id}`)} style={btnStyle('#1976d2')}>
                          Editar
                        </button>
                      )}
                      <button onClick={() => duplicateQuiz(q.id)} style={{ ...btnStyle('#888'), marginRight: 0 }}>
                        Duplicar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAdminSSR(ctx);
}

export default AdminDashboard;
