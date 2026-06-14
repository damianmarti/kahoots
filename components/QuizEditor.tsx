import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export interface EditorOption {
  text: string;
  isCorrect: boolean;
}

export interface EditorQuestion {
  type: 'true_false' | 'single' | 'multi';
  text: string;
  imageUrl: string | null;
  timeLimit: number;
  options: EditorOption[];
}

export interface EditorQuiz {
  name: string;
  questions: EditorQuestion[];
}

const TIME_LIMITS = [30, 45, 60, 90, 120];
const TYPE_LABELS: Record<string, string> = {
  true_false: 'Verdadero / Falso',
  single: 'Multiple choice (1 correcta)',
  multi: 'Multiple choice (1 o más correctas)',
};

const inputStyle: React.CSSProperties = { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 };
const smallBtn = (bg: string, disabled = false): React.CSSProperties => ({
  background: disabled ? '#ccc' : bg, color: '#fff', border: 'none', borderRadius: 6,
  padding: '6px 12px', fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
});

function newQuestion(type: EditorQuestion['type'] = 'single'): EditorQuestion {
  return {
    type,
    text: '',
    imageUrl: null,
    timeLimit: 30,
    options: optionsForType(type),
  };
}

// Ninguna opción viene pre-marcada como correcta: el admin debe elegirla
// explícitamente (la validación al guardar exige exactamente una)
function optionsForType(type: EditorQuestion['type']): EditorOption[] {
  if (type === 'true_false') {
    return [
      { text: 'Verdadero', isCorrect: false },
      { text: 'Falso', isCorrect: false },
    ];
  }
  return [0, 1, 2, 3].map(() => ({ text: '', isCorrect: false }));
}

const QuizEditor: React.FC<{ quizId?: number; initial?: EditorQuiz }> = ({ quizId, initial }) => {
  const router = useRouter();
  const [name, setName] = useState(initial?.name || '');
  const [questions, setQuestions] = useState<EditorQuestion[]>(initial?.questions || [newQuestion()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const updateQuestion = (idx: number, patch: Partial<EditorQuestion>) => {
    setQuestions(qs => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const changeType = (idx: number, type: EditorQuestion['type']) => {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== idx) return q;
      // Conserva textos al pasar entre single y multi; reinicia correctas
      const options = q.type !== 'true_false' && type !== 'true_false'
        ? q.options.map(o => ({ ...o, isCorrect: false }))
        : optionsForType(type);
      return { ...q, type, options };
    }));
  };

  const setCorrect = (qIdx: number, oIdx: number, multi: boolean) => {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qIdx) return q;
      return {
        ...q,
        options: q.options.map((o, j) =>
          multi ? (j === oIdx ? { ...o, isCorrect: !o.isCorrect } : o) : { ...o, isCorrect: j === oIdx }
        ),
      };
    }));
  };

  const move = (idx: number, dir: -1 | 1) => {
    setQuestions(qs => {
      const next = [...qs];
      const [q] = next.splice(idx, 1);
      next.splice(idx + dir, 0, q);
      return next;
    });
  };

  const uploadImage = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) updateQuestion(idx, { imageUrl: data.url });
      else setError(data.error || 'No se pudo subir la imagen.');
    } catch {
      setError('No se pudo subir la imagen.');
    } finally {
      setUploadingIdx(null);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(quizId ? `/api/admin/quizzes/${quizId}` : '/api/admin/quizzes', {
        method: quizId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, questions }),
      });
      const data = await res.json();
      if (res.ok) router.push('/admin');
      else setError(data.error || 'No se pudo guardar.');
    } catch {
      setError('No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '80vh', background: '#f6f8fa', padding: '0 16px 48px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Link href="/admin" legacyBehavior><a style={{ color: '#1976d2' }}>← Volver</a></Link>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#1976d2', margin: '16px 0 24px' }}>
          {quizId ? 'Editar cuestionario' : 'Nuevo cuestionario'}
        </h2>

        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: 24, marginBottom: 24 }}>
          <label style={{ fontWeight: 500 }}>Nombre del cuestionario:</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
        </div>

        {questions.map((q, idx) => (
          <div key={idx} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 600 }}>Pregunta {idx + 1}</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => move(idx, -1)} disabled={idx === 0} style={smallBtn('#888', idx === 0)}>↑</button>
                <button onClick={() => move(idx, 1)} disabled={idx === questions.length - 1} style={smallBtn('#888', idx === questions.length - 1)}>↓</button>
                <button onClick={() => setQuestions(qs => qs.filter((_, i) => i !== idx))} disabled={questions.length === 1} style={smallBtn('#d32f2f', questions.length === 1)}>Eliminar</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: 220 }}>
                <label style={{ fontWeight: 500 }}>Tipo:</label><br />
                <select value={q.type} onChange={e => changeType(idx, e.target.value as EditorQuestion['type'])} style={{ ...inputStyle, marginTop: 6 }}>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ fontWeight: 500 }}>Tiempo:</label><br />
                <select value={q.timeLimit} onChange={e => updateQuestion(idx, { timeLimit: parseInt(e.target.value, 10) })} style={{ ...inputStyle, marginTop: 6 }}>
                  {TIME_LIMITS.map(t => (
                    <option key={t} value={t}>{t < 60 ? `${t} segundos` : t === 60 ? '1 minuto' : t === 90 ? '90 segundos' : '2 minutos'}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 500 }}>Texto de la pregunta:</label>
              <textarea value={q.text} onChange={e => updateQuestion(idx, { text: e.target.value })} rows={2} style={{ ...inputStyle, marginTop: 6, resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 500 }}>Imagen (opcional):</label><br />
              {q.imageUrl ? (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <img src={q.imageUrl} alt="" style={{ maxHeight: 120, maxWidth: 240, borderRadius: 8, border: '1px solid #eee' }} />
                  <button onClick={() => updateQuestion(idx, { imageUrl: null })} style={smallBtn('#d32f2f')}>Quitar</button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingIdx === idx}
                  onChange={e => e.target.files?.[0] && uploadImage(idx, e.target.files[0])}
                  style={{ marginTop: 8 }}
                />
              )}
              {uploadingIdx === idx && <span style={{ marginLeft: 12, color: '#666' }}>Subiendo...</span>}
            </div>

            <label style={{ fontWeight: 500 }}>
              Opciones {q.type === 'multi' ? '(marcá todas las correctas)' : '(marcá la correcta)'}:
            </label>
            {q.options.map((o, oIdx) => (
              <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <input
                  type={q.type === 'multi' ? 'checkbox' : 'radio'}
                  name={`correct-${idx}`}
                  checked={o.isCorrect}
                  onChange={() => setCorrect(idx, oIdx, q.type === 'multi')}
                  style={{ width: 18, height: 18 }}
                />
                {q.type === 'true_false' ? (
                  <span style={{ fontSize: 16 }}>{o.text}</span>
                ) : (
                  <input
                    type="text"
                    value={o.text}
                    placeholder={`Opción ${oIdx + 1}`}
                    onChange={e => updateQuestion(idx, {
                      options: q.options.map((opt, j) => (j === oIdx ? { ...opt, text: e.target.value } : opt)),
                    })}
                    style={inputStyle}
                  />
                )}
              </div>
            ))}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={() => setQuestions(qs => [...qs, newQuestion()])} style={smallBtn('#455a64')}>
            + Agregar pregunta
          </button>
          <button onClick={save} disabled={saving} style={smallBtn('#388e3c', saving)}>
            {saving ? 'Guardando...' : 'Guardar cuestionario'}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 18, color: '#d32f2f', background: '#ffebee', borderRadius: 6, padding: '10px 18px', fontWeight: 500 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizEditor;
