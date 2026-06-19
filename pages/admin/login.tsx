import React, { useState } from 'react';
import { useRouter } from 'next/router';

const inputStyle: React.CSSProperties = { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 };

const AdminLogin: React.FC = () => {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const next = typeof router.query.next === 'string' ? router.query.next : '/admin';
        router.push(next);
      } else {
        const data = await res.json();
        setError(data.error || 'Error al iniciar sesión.');
      }
    } catch {
      setError('Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '80vh', background: '#f6f8fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          padding: '40px 32px',
          maxWidth: 380,
          width: '100%',
        }}
      >
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 28, color: '#1976d2', textAlign: 'center' }}>Admin</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontWeight: 500 }}>Usuario:</label>
            <br />
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required autoFocus style={inputStyle} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontWeight: 500 }}>Contraseña:</label>
            <br />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#b3d1f7' : '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '12px 0',
              fontSize: 18,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        {error && (
          <div
            style={{
              marginTop: 22,
              color: '#d32f2f',
              background: '#ffebee',
              borderRadius: 6,
              padding: '10px 18px',
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;
