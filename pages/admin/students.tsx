import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { GetServerSidePropsContext } from 'next';
import { requireAdminSSR, AdminSession } from '../../lib/auth';

const inputStyle: React.CSSProperties = { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 };

interface StudentRow {
  padron: string;
  first_name: string;
  last_name: string;
}

const AdminStudents: React.FC<{ admin: AdminSession }> = () => {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [padron, setPadron] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    fetch('/api/admin/students')
      .then(r => r.json())
      .then(d => setStudents(d.students || []));
  };
  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch('/api/admin/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ padron, firstName, lastName }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage({ text: 'Alumno guardado.', ok: true });
      setPadron('');
      setFirstName('');
      setLastName('');
      load();
    } else {
      setMessage({ text: data.error || 'Error al guardar.', ok: false });
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/admin/students-upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) {
      setMessage({ text: `Se importaron ${data.count} alumnos.`, ok: true });
      setFile(null);
      load();
    } else {
      setMessage({ text: data.error || 'Error al importar.', ok: false });
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '80vh', background: '#f6f8fa', padding: '0 16px 48px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <Link href="/admin" legacyBehavior>
          <a style={{ color: '#1976d2' }}>← Volver</a>
        </Link>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#1976d2', margin: '16px 0 24px' }}>Alumnos</h2>

        {message && (
          <div
            style={{
              marginBottom: 18,
              color: message.ok ? '#388e3c' : '#d32f2f',
              background: message.ok ? '#e8f5e9' : '#ffebee',
              borderRadius: 6,
              padding: '10px 18px',
              fontWeight: 500,
            }}
          >
            {message.text}
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Agregar alumno</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ width: 130 }}>
              <label style={{ fontWeight: 500 }}>Padrón:</label>
              <br />
              <input type="text" value={padron} onChange={e => setPadron(e.target.value)} required pattern="\d+" style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontWeight: 500 }}>Nombre:</label>
              <br />
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontWeight: 500 }}>Apellido:</label>
              <br />
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required style={inputStyle} />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? '#b3d1f7' : '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '10px 20px',
                fontSize: 16,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Guardar
            </button>
          </form>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Importar CSV</h3>
          <p style={{ color: '#666', marginBottom: 16 }}>Columnas: padrón, nombre, apellido (separadas por coma o punto y coma).</p>
          <form onSubmit={handleUpload} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="file" accept=".csv,.txt" onChange={e => setFile(e.target.files?.[0] || null)} required />
            <button
              type="submit"
              disabled={loading || !file}
              style={{
                background: loading || !file ? '#b3d1f7' : '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '10px 20px',
                fontSize: 16,
                fontWeight: 600,
                cursor: loading || !file ? 'not-allowed' : 'pointer',
              }}
            >
              Importar
            </button>
          </form>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#f0f4f8', fontWeight: 600 }}>{students.length} alumnos</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f4f8', textAlign: 'left' }}>
                <th style={{ padding: '10px 16px' }}>Padrón</th>
                <th style={{ padding: '10px 16px' }}>Apellido</th>
                <th style={{ padding: '10px 16px' }}>Nombre</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.padron} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '10px 16px' }}>{s.padron}</td>
                  <td style={{ padding: '10px 16px' }}>{s.last_name}</td>
                  <td style={{ padding: '10px 16px' }}>{s.first_name}</td>
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

export default AdminStudents;
