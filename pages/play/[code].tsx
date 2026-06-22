import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import RankDelta from '../../components/RankDelta';

const OPTION_COLORS = ['#e21b3c', '#1368ce', '#d89e00', '#26890c'];

interface PlayState {
  status: string;
  quizName: string;
  questionIndex: number | null;
  totalQuestions: number;
  nickname: string;
  score: number;
  playerCount?: number;
  question?: {
    id: number;
    type: string;
    text: string;
    imageUrl?: string | null;
    timeLimit?: number;
  };
  options?: { id: number; text: string }[];
  remainingMs?: number;
  alreadyAnswered?: boolean;
  correctOptionIds?: number[];
  yourAnswer?: {
    isCorrect: boolean;
    points: number;
    selectedOptionIds: number[];
  } | null;
  leaderboard?: {
    padron: string;
    nickname: string;
    score: number;
    rank: number;
    prevRank?: number;
  }[];
  yourScore?: number;
  yourRank?: number;
  yourPrevRank?: number;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 12,
  borderRadius: 8,
  border: '1px solid #ccc',
  fontSize: 18,
  boxSizing: 'border-box',
};

const PlayGame: React.FC = () => {
  const router = useRouter();
  const code = ((router.query.code as string) || '').toUpperCase();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false); // ya se leyó localStorage
  const [state, setState] = useState<PlayState | null>(null);
  const [kicked, setKicked] = useState(false);
  const [padron, setPadron] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [sent, setSent] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerTarget = useRef(0);
  const lastQuestionId = useRef<number | null>(null);

  // Token guardado (refresh = reanudar)
  useEffect(() => {
    if (!code) return;
    setToken(localStorage.getItem(`game-${code}`));
    setReady(true);
  }, [code]);

  // Polling cada 1.5s
  useEffect(() => {
    if (!token || kicked) return;
    let active = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/play/${code}/poll`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!active) return;
        if (res.status === 401) {
          setKicked(true);
          localStorage.removeItem(`game-${code}`);
          return;
        }
        if (res.ok) {
          const data: PlayState = await res.json();
          setState(data);
          if (data.status === 'question' && data.question) {
            if (lastQuestionId.current !== data.question.id) {
              lastQuestionId.current = data.question.id;
              setSelected([]);
              setSent(false);
            }
            timerTarget.current = Date.now() + (data.remainingMs || 0);
          }
        }
      } catch {
        /* reintenta en el próximo tick */
      }
    };
    tick();
    const interval = setInterval(tick, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [token, code, kicked]);

  // El resultado final se muestra recién cuando el host terminó de revelar
  // el podio en la pantalla grande (1ro a los ~7s), para no spoilear
  useEffect(() => {
    if (state?.status !== 'podium') {
      setShowFinal(false);
      return;
    }
    const t = setTimeout(() => setShowFinal(true), 8500);
    return () => clearTimeout(t);
  }, [state?.status]);

  // Timer visual local
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((timerTarget.current - Date.now()) / 1000)));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`/api/play/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ padron, nickname }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem(`game-${code}`, data.playerToken);
        setToken(data.playerToken);
        setKicked(false);
      } else {
        setError(data.error || 'No se pudo entrar al juego.');
      }
    } catch {
      setError('No se pudo entrar al juego.');
    } finally {
      setJoining(false);
    }
  };

  const sendAnswer = async (optionIds: number[]) => {
    if (sent || !state?.question) return;
    setSent(true);
    try {
      const res = await fetch(`/api/play/${code}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionId: state.question.id,
          selectedOptionIds: optionIds,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401) {
          setKicked(true);
          localStorage.removeItem(`game-${code}`);
          return;
        }
        setError(data.error || 'No se pudo enviar la respuesta.');
        setSent(false);
      }
    } catch {
      setSent(false);
    }
  };

  if (kicked) {
    return (
      <Screen color="#b71c1c">
        <div className="anim-fade-in-scale" style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 60, marginBottom: 18 }}>⚠️</div>
          <h2 style={{ fontSize: 26, lineHeight: 1.4, maxWidth: 420 }}>Tu sesión ya no es válida porque otro usuario entró con tu padrón.</h2>
        </div>
      </Screen>
    );
  }

  if (!ready)
    return (
      <Screen>
        <div style={{ color: '#fff', fontSize: 22 }}>Cargando...</div>
      </Screen>
    );

  if (!token) {
    return (
      <Screen>
        <div
          className="anim-slide-up"
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '34px 28px',
            width: '100%',
            maxWidth: 380,
          }}
        >
          <h2
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: '#1976d2',
              textAlign: 'center',
              marginTop: 0,
              marginBottom: 6,
            }}
          >
            Unirse al juego
          </h2>
          <div
            style={{
              textAlign: 'center',
              color: '#888',
              marginBottom: 24,
              fontSize: 18,
              letterSpacing: 3,
              fontWeight: 700,
            }}
          >
            {code}
          </div>
          <form onSubmit={join}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 500 }}>Padrón:</label>
              <input type="text" inputMode="numeric" pattern="\d{4,20}" value={padron} onChange={e => setPadron(e.target.value)} required style={{ ...inputStyle, marginTop: 6 }} />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontWeight: 500 }}>Nickname:</label>
              <input type="text" maxLength={50} value={nickname} onChange={e => setNickname(e.target.value)} required style={{ ...inputStyle, marginTop: 6 }} />
            </div>
            <button
              type="submit"
              disabled={joining}
              style={{
                width: '100%',
                background: joining ? '#b3d1f7' : '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '14px 0',
                fontSize: 20,
                fontWeight: 700,
                cursor: joining ? 'not-allowed' : 'pointer',
              }}
            >
              {joining ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          {error && (
            <div
              style={{
                marginTop: 16,
                color: '#d32f2f',
                background: '#ffebee',
                borderRadius: 6,
                padding: '10px 14px',
                fontWeight: 500,
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}
        </div>
      </Screen>
    );
  }

  if (!state)
    return (
      <Screen>
        <div style={{ color: '#fff', fontSize: 22 }}>Conectando...</div>
      </Screen>
    );

  if (state.status === 'lobby') {
    return (
      <Screen>
        <div className="anim-fade-in-scale" style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>✅</div>
          <h2 style={{ fontSize: 28, margin: 0 }}>¡Ya estás dentro, {state.nickname}!</h2>
          <div style={{ fontSize: 19, marginTop: 12, opacity: 0.85 }}>Esperá a que empiece el juego...</div>
          <div style={{ fontSize: 17, marginTop: 20, opacity: 0.7 }}>
            {state.playerCount} jugador{state.playerCount === 1 ? '' : 'es'} en la sala
          </div>
        </div>
      </Screen>
    );
  }

  if (state.status === 'title') {
    return (
      <Screen>
        <div className="anim-fade-in-scale" style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 22, opacity: 0.85, marginBottom: 12 }}>¡Prepárate!</div>
          <h1 style={{ fontSize: 38, margin: 0 }}>{state.quizName}</h1>
        </div>
      </Screen>
    );
  }

  if (state.status === 'question') {
    const isMulti = state.question?.type === 'multi';
    if (state.alreadyAnswered || sent) {
      return (
        <Screen>
          <div className="anim-fade-in-scale" style={{ textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🚀</div>
            <h2 style={{ fontSize: 26 }}>¡Respuesta enviada!</h2>
            <div style={{ fontSize: 18, opacity: 0.85 }}>Esperando a los demás...</div>
          </div>
        </Screen>
      );
    }
    return (
      <Screen align="stretch">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#fff',
            marginBottom: 14,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 16 }}>
            Pregunta {(state.questionIndex ?? 0) + 1}/{state.totalQuestions}
          </div>
          <div
            style={{
              background: '#fff',
              color: secondsLeft <= 5 ? '#d32f2f' : '#1976d2',
              borderRadius: '50%',
              width: 52,
              height: 52,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 22,
            }}
          >
            {secondsLeft}
          </div>
        </div>
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '16px 18px',
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700 }}>{state.question?.text}</div>
          {state.question?.imageUrl && (
            <img
              src={state.question.imageUrl}
              alt={state.question.text ? `Imagen de la pregunta: ${state.question.text}` : 'Imagen de la pregunta'}
              style={{
                maxHeight: 160,
                maxWidth: '100%',
                marginTop: 10,
                borderRadius: 8,
              }}
            />
          )}
        </div>
        {isMulti && (
          <div
            style={{
              background: 'rgba(255,255,255,0.18)',
              color: '#fff',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 12,
              textAlign: 'center',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            ✓ Puede haber varias respuestas correctas — seleccioná todas las que correspondan y tocá Enviar
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {state.options?.map((o, i) => {
            const isSelected = selected.includes(o.id);
            return (
              <button
                key={o.id}
                onClick={() => {
                  if (isMulti) setSelected(s => (isSelected ? s.filter(x => x !== o.id) : [...s, o.id]));
                  else sendAnswer([o.id]);
                }}
                style={{
                  background: OPTION_COLORS[i % 4],
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  outline: isMulti && isSelected ? '4px solid #fff' : 'none',
                  padding: '22px 14px',
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: 'pointer',
                  minHeight: 76,
                }}
              >
                {isMulti && isSelected ? '✓ ' : ''}
                {o.text}
              </button>
            );
          })}
        </div>
        {isMulti && (
          <button
            onClick={() => sendAnswer(selected)}
            disabled={selected.length === 0}
            style={{
              marginTop: 16,
              background: selected.length === 0 ? 'rgba(255,255,255,0.4)' : '#fff',
              color: '#1976d2',
              border: 'none',
              borderRadius: 10,
              padding: '16px 0',
              fontSize: 20,
              fontWeight: 800,
              cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Enviar
          </button>
        )}
        {error && (
          <div
            style={{
              marginTop: 14,
              color: '#fff',
              background: 'rgba(211,47,47,0.9)',
              borderRadius: 6,
              padding: '10px 14px',
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}
      </Screen>
    );
  }

  if (state.status === 'reveal') {
    const a = state.yourAnswer;
    const correct = a?.isCorrect === true;
    const partial = !!a && !correct && a.points > 0;
    return (
      <Screen color={a ? (correct ? '#1b5e20' : partial ? '#e65100' : '#b71c1c') : undefined}>
        <div className="anim-fade-in-scale" style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 60, marginBottom: 14 }}>{a ? (correct ? '🎉' : partial ? '👏' : '😞') : '⏱'}</div>
          <h2 style={{ fontSize: 30, margin: 0 }}>{a ? (correct ? '¡Correcto!' : partial ? '¡Casi! Parcialmente correcto' : 'Incorrecto') : 'No respondiste'}</h2>
          {a && a.points > 0 && <div style={{ fontSize: 24, marginTop: 12, fontWeight: 700 }}>+{a.points} puntos</div>}
          <div style={{ fontSize: 18, marginTop: 18, opacity: 0.85 }}>Puntaje total: {state.score}</div>
        </div>
      </Screen>
    );
  }

  if (state.status === 'leaderboard' || state.status === 'podium') {
    const isPodium = state.status === 'podium';
    // En la primera pregunta todos partían empatados: el delta no es significativo.
    const showDelta = !isPodium && (state.questionIndex ?? 0) > 0;
    if (isPodium && !showFinal) {
      return (
        <Screen>
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <div className="anim-drum" style={{ fontSize: 70 }}>
              🥁
            </div>
            <h2 className="anim-pulse" style={{ fontSize: 26, marginTop: 18 }}>
              Se viene el podio...
            </h2>
            <div style={{ fontSize: 18, opacity: 0.85, marginTop: 10 }}>¡Mirá la pantalla! 👀</div>
          </div>
        </Screen>
      );
    }
    return (
      <Screen>
        <div
          className="anim-slide-up"
          style={{
            textAlign: 'center',
            color: '#fff',
            width: '100%',
            maxWidth: 420,
          }}
        >
          <h2 style={{ fontSize: 28, marginBottom: 6 }}>{isPodium ? '🏆 Resultado final' : 'Podio'}</h2>
          <div
            style={{
              background: '#fff',
              color: '#1976d2',
              borderRadius: 12,
              padding: '18px 22px',
              margin: '18px 0',
              fontWeight: 800,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <span style={{ fontSize: 40 }}>#{state.yourRank}</span>
              {showDelta && state.yourPrevRank != null && <RankDelta delta={state.yourPrevRank - (state.yourRank ?? 0)} size={22} />}
            </div>
            <div style={{ fontSize: 20 }}>
              {state.nickname} — {state.yourScore} puntos
            </div>
          </div>
          {state.leaderboard?.map(p => (
            <div
              key={p.padron}
              style={{
                background: 'rgba(255,255,255,0.15)',
                borderRadius: 8,
                padding: '10px 16px',
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 17,
                fontWeight: 600,
              }}
            >
              <span>
                {p.rank}. {p.nickname}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {showDelta && p.prevRank != null && <RankDelta delta={p.prevRank - p.rank} light />}
                <span>{p.score}</span>
              </span>
            </div>
          ))}
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div style={{ color: '#fff', fontSize: 22 }}>...</div>
    </Screen>
  );
};

const Screen: React.FC<{
  children: React.ReactNode;
  align?: string;
  color?: string;
}> = ({ children, align = 'center', color }) => (
  <div
    style={{
      minHeight: '100vh',
      background: color || 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: align as any,
      justifyContent: 'center',
      padding: '24px 16px',
      boxSizing: 'border-box',
      transition: 'background 0.4s',
    }}
  >
    {children}
  </div>
);

export default PlayGame;
