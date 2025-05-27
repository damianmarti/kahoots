import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Result {
  padron: string;
  first_name?: string;
  last_name?: string;
  correct_answers: number;
  incorrect_answers: number;
}

const ResultsPage: React.FC = () => {
  const [cuatrimestre, setCuatrimestre] = useState('2025-1');
  const [kahootName, setKahootName] = useState('');
  const [kahootNames, setKahootNames] = useState<string[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch available Kahoot names for the selected cuatrimestre
  useEffect(() => {
    if (!cuatrimestre) return;
    setKahootName('');
    setResults([]);
    fetch(`/api/kahoot-names?cuatrimestre=${encodeURIComponent(cuatrimestre)}`)
      .then(res => res.json())
      .then(data => setKahootNames(data.kahootNames || []));
  }, [cuatrimestre]);

  // Fetch results when kahootName is selected
  useEffect(() => {
    if (!cuatrimestre || !kahootName) return;
    setLoading(true);
    fetch(`/api/results?cuatrimestre=${encodeURIComponent(cuatrimestre)}&kahootName=${encodeURIComponent(kahootName)}`)
      .then(res => res.json())
      .then(data => setResults(data.results || []))
      .finally(() => setLoading(false));
  }, [cuatrimestre, kahootName]);

  // Calculate summary
  const totalStudents = results.length;
  let totalApproved = 0;
  let totalReproved = 0;
  const resultsWithApproval = results.map(r => {
    const total = r.correct_answers + r.incorrect_answers;
    const approved = total > 0 && (r.correct_answers / total) >= 0.6;
    if (approved) totalApproved++;
    else totalReproved++;
    return { ...r, approved };
  });
  const percentApproved = totalStudents > 0 ? Math.round((totalApproved / totalStudents) * 100) : 0;

  return (
    <div style={{ minHeight: '80vh', background: '#f6f8fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '40px 32px',
        maxWidth: 700,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 28, color: '#1976d2', textAlign: 'center' }}>
          Resultados de Kahoot
        </h2>
        <div style={{ marginBottom: 16, width: '100%' }}>
          <label style={{ fontWeight: 500 }}>Cuatrimestre:</label><br />
          <select value={cuatrimestre} onChange={e => setCuatrimestre(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}>
            <option value="2025-1">2025-1</option>
          </select>
        </div>
        <div style={{ marginBottom: 16, width: '100%' }}>
          <label style={{ fontWeight: 500 }}>Nombre del Kahoot:</label><br />
          <select value={kahootName} onChange={e => setKahootName(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}>
            <option value="">Seleccionar Kahoot</option>
            {kahootNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        {loading && <div style={{ marginTop: 20 }}>Cargando resultados...</div>}
        {!loading && results.length > 0 && (
          <>
            <div style={{
              marginBottom: 28,
              padding: '28px 18px 18px 18px',
              background: '#f7fafc',
              borderRadius: 14,
              border: '1.5px solid #bbdefb',
              width: '100%',
              boxShadow: '0 2px 12px rgba(25, 118, 210, 0.07)',
              textAlign: 'center',
              fontWeight: 500,
              color: '#1976d2',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              <div style={{ position: 'absolute', top: 10, left: 24, fontSize: 22, fontWeight: 700, color: '#1976d2', letterSpacing: 1 }}>
                Resumen
              </div>
              <div style={{ display: 'flex', gap: 32, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={{ minWidth: 120 }}>
                  <div style={{ fontSize: 15, color: '#888' }}>Total estudiantes</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#1976d2' }}>{totalStudents}</div>
                </div>
                <div style={{ minWidth: 120 }}>
                  <div style={{ fontSize: 15, color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#388e3c', fontSize: 18, marginRight: 6 }}>✔</span> Aprobados
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#388e3c' }}>{totalApproved}</div>
                </div>
                <div style={{ minWidth: 120 }}>
                  <div style={{ fontSize: 15, color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#d32f2f', fontSize: 18, marginRight: 6 }}>✘</span> Desaprobados
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#d32f2f' }}>{totalReproved}</div>
                </div>
                <div style={{ minWidth: 120 }}>
                  <div style={{ fontSize: 15, color: '#888' }}>% Aprobados</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: percentApproved >= 60 ? '#388e3c' : '#d32f2f' }}>{percentApproved}%</div>
                </div>
              </div>
            </div>
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10, fontSize: 16 }}>
                <thead>
                  <tr style={{ background: '#f1f8e9' }}>
                    <th style={{ border: '1px solid #ccc', padding: 10 }}>Padrón</th>
                    <th style={{ border: '1px solid #ccc', padding: 10 }}>Apellido</th>
                    <th style={{ border: '1px solid #ccc', padding: 10 }}>Nombre</th>
                    <th style={{ border: '1px solid #ccc', padding: 10 }}>Correctas</th>
                    <th style={{ border: '1px solid #ccc', padding: 10 }}>Incorrectas</th>
                    <th style={{ border: '1px solid #ccc', padding: 10 }}>Aprobado</th>
                  </tr>
                </thead>
                <tbody>
                  {resultsWithApproval.map((r, i) => (
                    <tr
                      key={r.padron + i}
                      style={{
                        background: r.approved ? '#e8f5e9' : '#ffebee',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = r.approved ? '#c8e6c9' : '#ffcdd2')}
                      onMouseLeave={e => (e.currentTarget.style.background = r.approved ? '#e8f5e9' : '#ffebee')}
                    >
                      <td style={{ border: '1px solid #ccc', padding: 10 }}>
                        <Link
                          href={{ pathname: '/student-summary', query: { cuatrimestre, padron: r.padron } }}
                          style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}
                          onMouseOver={e => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseOut={e => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          {r.padron}
                        </Link>
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: 10 }}>{r.last_name || ''}</td>
                      <td style={{ border: '1px solid #ccc', padding: 10 }}>{r.first_name || ''}</td>
                      <td style={{ border: '1px solid #ccc', padding: 10 }}>{r.correct_answers}</td>
                      <td style={{ border: '1px solid #ccc', padding: 10 }}>{r.incorrect_answers}</td>
                      <td style={{ border: '1px solid #ccc', padding: 10 }}>{r.approved ? 'Sí' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {!loading && kahootName && results.length === 0 && (
          <div style={{ marginTop: 20, color: '#d32f2f', fontWeight: 500 }}>No se encontraron resultados.</div>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;