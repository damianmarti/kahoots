import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSidePropsContext } from 'next';
import { requireAdminSSR, AdminSession } from '../../../lib/auth';

interface GameRow {
  id: number;
  code: string;
  status: string;
  created_at: string;
  finished_at: string | null;
  quiz_name: string;
  started_by_username: string;
  player_count: number;
}

const STATUS_LABELS: Record<string, string> = {
  lobby: 'En sala',
  title: 'En curso',
  question: 'En curso',
  reveal: 'En curso',
  leaderboard: 'En curso',
  podium: 'Terminado',
};

const AdminGames: React.FC<{ admin: AdminSession }> = () => {
  const router = useRouter();
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/games')
      .then(r => r.json())
      .then(d => setGames(d.games || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '80vh', background: '#f6f8fa', padding: '0 16px 48px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Link href="/admin" legacyBehavior>
          <a style={{ color: '#1976d2' }}>← Volver</a>
        </Link>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#1976d2', margin: '16px 0 24px' }}>Juegos</h2>
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>Cargando...</div>
          ) : games.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>Todavía no se jugó ningún cuestionario.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f4f8', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Cuestionario</th>
                  <th style={{ padding: '12px 16px' }}>Código</th>
                  <th style={{ padding: '12px 16px' }}>Estado</th>
                  <th style={{ padding: '12px 16px' }}>Jugadores</th>
                  <th style={{ padding: '12px 16px' }}>Iniciado por</th>
                  <th style={{ padding: '12px 16px' }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {games.map(g => (
                  <tr
                    key={g.id}
                    onClick={() => router.push(g.status === 'podium' ? `/admin/games/${g.id}` : `/host/${g.id}`)}
                    style={{ borderTop: '1px solid #eee', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f0f7ff')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{g.quiz_name}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{g.code}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          background: g.status === 'podium' ? '#e8f5e9' : '#fff3e0',
                          color: g.status === 'podium' ? '#388e3c' : '#f57c00',
                          borderRadius: 6,
                          padding: '4px 10px',
                          fontWeight: 600,
                          fontSize: 14,
                        }}
                      >
                        {STATUS_LABELS[g.status] || g.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{g.player_count}</td>
                    <td style={{ padding: '12px 16px' }}>{g.started_by_username}</td>
                    <td style={{ padding: '12px 16px' }}>{new Date(g.created_at).toLocaleString('es-AR')}</td>
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

export default AdminGames;
