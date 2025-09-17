import React, { useState } from 'react';

const UploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [kahootName, setKahootName] = useState('');
  const [cuatrimestre, setCuatrimestre] = useState('2025-1');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !kahootName) {
      setMessage('Por favor, complete todos los campos.');
      return;
    }
    setLoading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kahootName', kahootName);
    formData.append('cuatrimestre', cuatrimestre);
    formData.append('password', password);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setMessage('¡Carga exitosa!');
        setFile(null);
        setKahootName('');
      } else {
        const data = await res.json();
        setMessage(data.error || 'La carga falló.');
      }
    } catch (err) {
      setMessage('La carga falló.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '80vh', background: '#f6f8fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '40px 32px',
        maxWidth: 420,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 28, color: '#1976d2', textAlign: 'center' }}>
          Subir resultados de Kahoot
        </h2>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontWeight: 500 }}>Nombre del Kahoot:</label><br />
            <input
              type="text"
              value={kahootName}
              onChange={e => setKahootName(e.target.value)}
              required
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontWeight: 500 }}>Cuatrimestre:</label><br />
            <select value={cuatrimestre} onChange={e => setCuatrimestre(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}>
              <option value="2025-1">2025-1</option>
              <option value="2025-2">2025-2</option>
            </select>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontWeight: 500 }}>Contraseña:</label><br />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontWeight: 500 }}>Archivo XLSX:</label><br />
            <input type="file" accept=".xlsx" onChange={handleFileChange} required style={{ marginTop: 6 }} />
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
              transition: 'background 0.2s',
              boxShadow: '0 2px 8px rgba(25, 118, 210, 0.08)'
            }}
          >
            {loading ? 'Subiendo...' : 'Subir'}
          </button>
        </form>
        {message && (
          <div style={{
            marginTop: 22,
            color: message === '¡Carga exitosa!' ? '#388e3c' : '#d32f2f',
            background: message === '¡Carga exitosa!' ? '#e8f5e9' : '#ffebee',
            borderRadius: 6,
            padding: '10px 18px',
            fontWeight: 500,
            textAlign: 'center',
            width: '100%',
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;