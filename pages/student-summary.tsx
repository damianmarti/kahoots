import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

interface StudentOption {
  padron: string;
  first_name?: string;
  last_name?: string;
}

interface KahootPlayed {
  kahoot_name: string;
  correct_answers: number;
  incorrect_answers: number;
  approved: boolean;
}

const StudentSummaryPage: React.FC = () => {
  const router = useRouter();
  const [cuatrimestre, setCuatrimestre] = useState('2025-1');
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedPadron, setSelectedPadron] = useState('');
  const [kahoots, setKahoots] = useState<KahootPlayed[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoShow, setAutoShow] = useState(false);
  const [allKahootNames, setAllKahootNames] = useState<string[]>([]);

  // Get cuatrimestre and padron from query params
  useEffect(() => {
    if (router.isReady) {
      const { cuatrimestre: qCuatri, padron: qPadron } = router.query;
      if (typeof qCuatri === 'string' && typeof qPadron === 'string') {
        setCuatrimestre(qCuatri);
        setSelectedPadron(qPadron);
        setAutoShow(true);
      } else {
        setAutoShow(false);
      }
    }
  }, [router.isReady, router.query]);

  // Fetch students for cuatrimestre
  useEffect(() => {
    setStudents([]);
    if (!cuatrimestre) return;
    fetch(`/api/student-list?cuatrimestre=${encodeURIComponent(cuatrimestre)}`)
      .then(res => res.json())
      .then(data => setStudents(data.students || []));
  }, [cuatrimestre]);

  // Fetch kahoots for selected student
  useEffect(() => {
    if (!cuatrimestre || !selectedPadron) return;
    setLoading(true);
    fetch(`/api/student-kahoots?cuatrimestre=${encodeURIComponent(cuatrimestre)}&padron=${encodeURIComponent(selectedPadron)}`)
      .then(res => res.json())
      .then(data => setKahoots(data.kahoots || []))
      .finally(() => setLoading(false));
  }, [cuatrimestre, selectedPadron]);

  // Fetch all kahoot names for cuatrimestre
  useEffect(() => {
    if (!cuatrimestre) return;
    fetch(`/api/kahoot-names?cuatrimestre=${encodeURIComponent(cuatrimestre)}`)
      .then(res => res.json())
      .then(data => setAllKahootNames(data.kahootNames || []));
  }, [cuatrimestre]);

  // Summary
  const playedKahootNames = kahoots.map(k => k.kahoot_name);
  const notPlayedKahoots = allKahootNames.filter(name => !playedKahootNames.includes(name));
  const totalKahootsInCuatrimestre = allKahootNames.length;
  const kahootsApproved = kahoots.filter(k => k.approved).length;
  const kahootsFailed = kahoots.length - kahootsApproved;
  const percentApproved = totalKahootsInCuatrimestre > 0 ? Math.round((kahootsApproved / totalKahootsInCuatrimestre) * 100) : 0;
  const approved = percentApproved >= 60;

  return (
    <div style={{ minHeight: '80vh', background: '#f6f8fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
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
          Resumen de estudiante
        </h2>
        {(!autoShow || !cuatrimestre || !selectedPadron) && (
          <>
            <div style={{ marginBottom: 18, width: '100%' }}>
              <label style={{ fontWeight: 500 }}>Cuatrimestre:</label><br />
              <select value={cuatrimestre} onChange={e => setCuatrimestre(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}>
                <option value="2025-1">2025-1</option>
              </select>
            </div>
            <div style={{ marginBottom: 18, width: '100%' }}>
              <label style={{ fontWeight: 500 }}>Estudiante:</label><br />
              <select value={selectedPadron} onChange={e => setSelectedPadron(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}>
                <option value="">Seleccionar estudiante</option>
                {students.map(s => (
                  <option key={s.padron} value={s.padron}>
                    {s.padron} - {s.first_name || ''} {s.last_name || ''}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        {loading && <div style={{ marginTop: 20 }}>Cargando kahoots...</div>}
        {!loading && selectedPadron && (
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#1976d2', marginBottom: 8 }}>
                <span style={{ fontSize: 28, marginRight: 10 }}>👤</span> Resumen
              </div>
              <div style={{ display: 'flex', gap: 32, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={{ minWidth: 120 }}>
                  <div style={{ fontSize: 15, color: '#388e3c' }}>✔ Kahoots aprobados</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#388e3c' }}>{kahootsApproved}</div>
                </div>
                <div style={{ minWidth: 120 }}>
                  <div style={{ fontSize: 15, color: '#d32f2f' }}>✘ Kahoots fallidos</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#d32f2f' }}>{kahootsFailed}</div>
                </div>
                <div style={{ minWidth: 120 }}>
                  <div style={{ fontSize: 15, color: '#888' }}>🕑 Kahoots no jugados</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#888' }}>{notPlayedKahoots.length}</div>
                </div>
                <div style={{ minWidth: 120 }}>
                  <div style={{ fontSize: 15, color: '#888' }}>% Aprobados</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: percentApproved >= 60 ? '#388e3c' : '#d32f2f' }}>{percentApproved}%</div>
                </div>
                <div style={{ minWidth: 120 }}>
                  <div style={{ fontSize: 15, color: '#888' }}>Aprobado</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: approved ? '#388e3c' : '#d32f2f' }}>{approved ? 'Sí' : 'No'}</div>
                </div>
              </div>
            </div>
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10, fontSize: 16 }}>
                <thead>
                  <tr style={{ background: '#f1f8e9' }}>
                    <th style={{ border: '1px solid #ccc', padding: 10 }}>Kahoot</th>
                    <th style={{ border: '1px solid #ccc', padding: 10 }}>Correctas</th>
                    <th style={{ border: '1px solid #ccc', padding: 10 }}>Incorrectas</th>
                    <th style={{ border: '1px solid #ccc', padding: 10 }}>Aprobado</th>
                  </tr>
                </thead>
                <tbody>
                  {kahoots.map((k, i) => (
                    <tr
                      key={k.kahoot_name + i}
                      style={{
                        background: k.approved ? '#e8f5e9' : '#ffebee',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = k.approved ? '#c8e6c9' : '#ffcdd2')}
                      onMouseLeave={e => (e.currentTarget.style.background = k.approved ? '#e8f5e9' : '#ffebee')}
                    >
                      <td style={{ border: '1px solid #ccc', padding: 10 }}>{k.kahoot_name}</td>
                      <td style={{ border: '1px solid #ccc', padding: 10 }}>{k.correct_answers}</td>
                      <td style={{ border: '1px solid #ccc', padding: 10 }}>{k.incorrect_answers}</td>
                      <td style={{ border: '1px solid #ccc', padding: 10, fontWeight: 600, color: k.approved ? '#388e3c' : '#d32f2f' }}>{k.approved ? 'Sí' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {!loading && selectedPadron && kahoots.length === 0 && (
          <div style={{ marginTop: 20, color: '#d32f2f', fontWeight: 500 }}>No se encontraron Kahoots para este estudiante.</div>
        )}
      </div>
    </div>
  );
};

export default StudentSummaryPage;