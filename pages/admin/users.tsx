import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { GetServerSidePropsContext } from 'next';
import { requireAdminSSR, AdminSession } from '../../lib/auth';

const inputStyle: React.CSSProperties = { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 };

interface UserRow {
  id: number;
  username: string;
  created_at: string;
  created_by_username: string | null;
}

const AdminUsers: React.FC<{ admin: AdminSession }> = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    fetch('/api/admin/users').then(r => r.json()).then(d => setUsers(d.users || []));
  };
  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage({ text: `Admin "${username}" creado.`, ok: true });
      setUsername('');
      setPassword('');
      load();
    } else {
      setMessage({ text: data.error || 'Error al crear el admin.', ok: false });
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '80vh', background: '#f6f8fa', padding: '0 16px 48px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <Link href="/admin" legacyBehavior><a style={{ color: '#1976d2' }}>← Volver</a></Link>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#1976d2', margin: '16px 0 24px' }}>Usuarios admin</h2>

        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Crear nuevo admin</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ fontWeight: 500 }}>Usuario:</label><br />
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ fontWeight: 500 }}>Contraseña (mín. 8):</label><br />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} style={{
              background: loading ? '#b3d1f7' : '#1976d2', color: '#fff', border: 'none', borderRadius: 6,
              padding: '10px 20px', fontSize: 16, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              Crear
            </button>
          </form>
          {message && (
            <div style={{
              marginTop: 16, color: message.ok ? '#388e3c' : '#d32f2f',
              background: message.ok ? '#e8f5e9' : '#ffebee', borderRadius: 6, padding: '10px 18px', fontWeight: 500,
            }}>
              {message.text}
            </div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f4f8', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>Usuario</th>
                <th style={{ padding: '12px 16px' }}>Creado por</th>
                <th style={{ padding: '12px 16px' }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{u.username}</td>
                  <td style={{ padding: '12px 16px' }}>{u.created_by_username || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{new Date(u.created_at).toLocaleDateString('es-AR')}</td>
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

export default AdminUsers;
