import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface KahootSummary {
  kahootName: string;
  totalStudents: number;
  totalApproved: number;
  totalReproved: number;
  percentApproved: number;
}

interface StudentSummary {
  padron: string;
  kahootsApproved: number;
  kahootsFailed: number;
  percentApproved: number;
  approved: boolean;
  first_name?: string;
  last_name?: string;
}

const KahootSummaryPage: React.FC = () => {
  const [cuatrimestre, setCuatrimestre] = useState('2025-1');
  const [summaries, setSummaries] = useState<KahootSummary[]>([]);
  const [studentsSummary, setStudentsSummary] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMoreThanHalf, setShowMoreThanHalf] = useState(false);
  const [allKahootNames, setAllKahootNames] = useState<string[]>([]);

  useEffect(() => {
    if (!cuatrimestre) return;
    setLoading(true);
    fetch(`/api/kahoot-summary?cuatrimestre=${encodeURIComponent(cuatrimestre)}`)
      .then(res => res.json())
      .then(data => {
        setSummaries(data.summaries || []);
        setStudentsSummary(data.studentsSummary || []);
      })
      .finally(() => setLoading(false));
  }, [cuatrimestre]);

  useEffect(() => {
    if (!cuatrimestre) return;
    fetch(`/api/kahoot-names?cuatrimestre=${encodeURIComponent(cuatrimestre)}`)
      .then(res => res.json())
      .then(data => setAllKahootNames(data.kahootNames || []));
  }, [cuatrimestre]);

  const totalKahoots = summaries.length;
  const filteredStudents = showMoreThanHalf
    ? studentsSummary.filter(s => (s.kahootsApproved + s.kahootsFailed) > totalKahoots / 2)
    : studentsSummary;

  const totalStudents = filteredStudents.length;
  const totalApproved = filteredStudents.filter(s => s.approved).length;
  const totalFailed = totalStudents - totalApproved;
  const percentStudentsApproved = totalStudents > 0 ? Math.round((totalApproved / totalStudents) * 100) : 0;

  return (
    <div style={{ minHeight: '80vh', background: '#f6f8fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '40px 32px',
        maxWidth: 900,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 28, color: '#1976d2', textAlign: 'center' }}>
          Resumen de Kahoots
        </h2>
        <div style={{ marginBottom: 18, width: '100%' }}>
          <label style={{ fontWeight: 500 }}>Cuatrimestre:</label><br />
          <select value={cuatrimestre} onChange={e => setCuatrimestre(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}>
            <option value="2025-1">2025-1</option>
            <option value="2025-2">2025-2</option>
          </select>
        </div>
        {loading && <div style={{ marginTop: 20 }}>Cargando resumen...</div>}
        {!loading && summaries.length > 0 && (
          <>
            <div style={{
              marginBottom: 32,
              width: '100%',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 24,
              justifyContent: 'center',
            }}>
              {summaries.map((s) => (
                <div key={s.kahootName} style={{
                  background: '#f7fafc',
                  border: '1.5px solid #bbdefb',
                  borderRadius: 12,
                  boxShadow: '0 2px 12px rgba(25, 118, 210, 0.07)',
                  minWidth: 220,
                  maxWidth: 260,
                  flex: '1 1 220px',
                  padding: '18px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#1976d2', marginBottom: 8 }}>{s.kahootName}</div>
                  <div style={{ fontSize: 15, color: '#888' }}>Estudiantes: <span style={{ color: '#1976d2', fontWeight: 600 }}>{s.totalStudents}</span></div>
                  <div style={{ fontSize: 15, color: '#388e3c' }}>✔ Aprobados: <span style={{ fontWeight: 600 }}>{s.totalApproved}</span></div>
                  <div style={{ fontSize: 15, color: '#d32f2f' }}>✘ Desaprobados: <span style={{ fontWeight: 600 }}>{s.totalReproved}</span></div>
                  <div style={{ fontSize: 15, color: s.percentApproved >= 60 ? '#388e3c' : '#d32f2f', fontWeight: 600, marginTop: 4 }}>% Aprobados: {s.percentApproved}%</div>
                </div>
              ))}
            </div>
            <h3 style={{ marginTop: 20, marginBottom: 0, fontSize: 22, fontWeight: 700, color: '#1976d2', width: '100%', textAlign: 'center' }}>
              <div style={{
                margin: '32px 0 0 0',
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#1976d2', marginBottom: 8 }}>
                  <span style={{ fontSize: 28, marginRight: 10 }}>👥</span> Resumen de estudiantes
                </div>
                <div style={{ display: 'flex', gap: 32, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <div style={{ minWidth: 120 }}>
                    <div style={{ fontSize: 15, color: '#888' }}>Total estudiantes</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#1976d2' }}>{totalStudents}</div>
                  </div>
                  <div style={{ minWidth: 120 }}>
                    <div style={{ fontSize: 15, color: '#388e3c' }}>✔ Aprobados</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#388e3c' }}>{totalApproved}</div>
                  </div>
                  <div style={{ minWidth: 120 }}>
                    <div style={{ fontSize: 15, color: '#d32f2f' }}>✘ Desaprobados</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#d32f2f' }}>{totalFailed}</div>
                  </div>
                  <div style={{ minWidth: 120 }}>
                    <div style={{ fontSize: 15, color: '#888' }}>% Aprobados</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: percentStudentsApproved >= 60 ? '#388e3c' : '#d32f2f' }}>{
                      allKahootNames.length > 0 && totalStudents > 0
                        ? Math.round(
                            (filteredStudents.reduce((acc, s) => acc + s.kahootsApproved, 0) /
                              (totalStudents * allKahootNames.length)) * 100
                          )
                        : 0
                    }%</div>
                  </div>
                </div>
                <div style={{ margin: '18px 0 0 0', width: '100%', textAlign: 'center' }}>
                  <label style={{ fontWeight: 500, fontSize: 15 }}>
                    <input
                      type="checkbox"
                      checked={showMoreThanHalf}
                      onChange={e => setShowMoreThanHalf(e.target.checked)}
                      style={{ marginRight: 8 }}
                    />
                    Mostrar solo estudiantes que jugaron más de la mitad de los kahoots
                  </label>
                </div>
              </div>
            </h3>
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10, fontSize: 16 }}>
                <thead>
                  <tr style={{ background: '#f1f8e9' }}>
                    <th style={{ border: '1px solid #ccc', padding: 10 }}>Padrón</th>
                    <th style={{ border: '1px solid #ccc', padding: 10 }}>Apellido</th>
                    <th style={{ border: '1px solid #ccc', padding: 10 }}>Nombre</th>
                    <th style={{ border: '1px solid #ccc', padding: 10 }}>Kahoots aprobados</th>
                    <th style={{ border: '1px solid #ccc', padding: 10 }}>Kahoots fallidos</th>
                    <th style={{ border: '1px solid #ccc', padding: 10 }}>Kahoots no jugados</th>
                    <th style={{ border: '1px solid #ccc', padding: 10 }}>% Aprobados</th>
                    <th style={{ border: '1px solid #ccc', padding: 10 }}>Aprobado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, i) => {
                    const totalKahoots = allKahootNames.length;
                    const kahootsPlayed = s.kahootsApproved + s.kahootsFailed;
                    const kahootsNotPlayed = totalKahoots - kahootsPlayed;
                    const percentApproved = totalKahoots > 0 ? Math.round((s.kahootsApproved / totalKahoots) * 100) : 0;
                    const approved = percentApproved >= 60;
                    return (
                      <tr
                        key={s.padron}
                        style={{
                          background: approved ? '#e8f5e9' : '#ffebee',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = approved ? '#c8e6c9' : '#ffcdd2')}
                        onMouseLeave={e => (e.currentTarget.style.background = approved ? '#e8f5e9' : '#ffebee')}
                      >
                        <td style={{ border: '1px solid #ccc', padding: 10 }}>
                          <Link
                            href={{ pathname: '/student-summary', query: { cuatrimestre, padron: s.padron } }}
                            style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}
                            onMouseOver={e => (e.currentTarget.style.textDecoration = 'underline')}
                            onMouseOut={e => (e.currentTarget.style.textDecoration = 'none')}
                          >
                            {s.padron}
                          </Link>
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: 10 }}>{s.last_name || ''}</td>
                        <td style={{ border: '1px solid #ccc', padding: 10 }}>{s.first_name || ''}</td>
                        <td style={{ border: '1px solid #ccc', padding: 10 }}>{s.kahootsApproved}</td>
                        <td style={{ border: '1px solid #ccc', padding: 10 }}>{s.kahootsFailed}</td>
                        <td style={{ border: '1px solid #ccc', padding: 10 }}>{kahootsNotPlayed}</td>
                        <td style={{ border: '1px solid #ccc', padding: 10 }}>{percentApproved}%</td>
                        <td style={{ border: '1px solid #ccc', padding: 10, fontWeight: 600, color: approved ? '#388e3c' : '#d32f2f' }}>{approved ? 'Sí' : 'No'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        {!loading && summaries.length === 0 && (
          <div style={{ marginTop: 20, color: '#d32f2f', fontWeight: 500 }}>No se encontraron Kahoots para este cuatrimestre.</div>
        )}
      </div>
    </div>
  );
};

export default KahootSummaryPage;