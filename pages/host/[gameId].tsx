import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import type { GetServerSidePropsContext } from 'next';
import { requireAdminSSR } from '../../lib/auth';
import Countdown from '../../components/Countdown';
import MuteButton from '../../components/MuteButton';
import { useHostAudio } from '../../hooks/useHostAudio';

const OPTION_COLORS = ['#e21b3c', '#1368ce', '#d89e00', '#26890c'];
const MEDALS = ['🥇', '🥈', '🥉'];

interface HostState {
  status: string;
  code: string;
  quizName: string;
  questionIndex: number | null;
  totalQuestions: number;
  players?: { padron: string; nickname: string }[];
  question?: {
    id: number;
    type: string;
    text: string;
    imageUrl: string | null;
    timeLimit: number;
  };
  options?: {
    id: number;
    text: string;
    isCorrect: boolean;
    answerCount?: number;
  }[];
  remainingMs?: number;
  answeredCount?: number;
  activeCount?: number;
  playerCount?: number;
  leaderboard?: {
    padron: string;
    nickname: string;
    score: number;
    rank: number;
  }[];
}

const bigBtn: React.CSSProperties = {
  background: '#fff',
  color: '#1976d2',
  border: 'none',
  borderRadius: 10,
  padding: '16px 42px',
  fontSize: 22,
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
};

const HostGame: React.FC = () => {
  const router = useRouter();
  const gameId = router.query.gameId as string;
  const [state, setState] = useState<HostState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [podiumStage, setPodiumStage] = useState(0); // 0: nada, 1: 3ro, 2: 2do, 3: 1ro
  const [copied, setCopied] = useState(false);
  const advancing = useRef(false);
  const titleAdvanced = useRef(false);
  const pollNow = useRef<(() => Promise<void>) | null>(null);

  // Música por fase y efectos de sonido (el motor persiste entre fases)
  useHostAudio(state?.status, podiumStage);

  // Polling cada 1s
  useEffect(() => {
    if (!gameId) return;
    let active = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/host/${gameId}/poll`);
        if (!active) return;
        if (res.ok) setState(await res.json());
        else if (res.status === 401) router.push('/admin/login');
      } catch {
        /* reintenta en el próximo tick */
      }
    };
    pollNow.current = tick;
    tick();
    const interval = setInterval(tick, 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [gameId, router]);

  const advance = async (from: string) => {
    if (advancing.current) return;
    advancing.current = true;
    try {
      const res = await fetch(`/api/host/${gameId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from }),
      });
      if (res.ok) {
        // Refresca el estado completo: el nuevo status necesita su payload
        // (pregunta, opciones, leaderboard) que solo lo trae el poll
        await pollNow.current?.();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al avanzar.');
      }
    } finally {
      advancing.current = false;
    }
  };

  // Animación del título: auto-avanza a la primera pregunta a los 4s
  useEffect(() => {
    if (state?.status !== 'title') {
      titleAdvanced.current = false;
      return;
    }
    if (titleAdvanced.current) return;
    titleAdvanced.current = true;
    const t = setTimeout(() => advance('title'), 4000);
    return () => clearTimeout(t);
  }, [state?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Podio con suspenso: redoble -> 3ro -> 2do -> 1ro -> botones
  useEffect(() => {
    if (state?.status !== 'podium') {
      setPodiumStage(0);
      return;
    }
    if (podiumStage > 0) return;
    const timeouts = [setTimeout(() => setPodiumStage(1), 2000), setTimeout(() => setPodiumStage(2), 4500), setTimeout(() => setPodiumStage(3), 7000), setTimeout(() => setPodiumStage(4), 8500)];
    return () => timeouts.forEach(clearTimeout);
  }, [state?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state) {
    return (
      <Screen>
        <div style={{ color: '#fff', fontSize: 24 }}>Cargando...</div>
      </Screen>
    );
  }

  if (state.status === 'lobby') {
    const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/play/${state.code}` : `/play/${state.code}`;
    const copyJoinUrl = async () => {
      try {
        await navigator.clipboard.writeText(joinUrl);
      } catch {
        // Fallback para contextos sin clipboard API (ej: http en LAN)
        const ta = document.createElement('textarea');
        ta.value = joinUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    return (
      <Screen>
        <h1 style={{ color: '#fff', fontSize: 40, marginBottom: 8 }}>{state.quizName}</h1>
        <button
          type="button"
          onClick={copyJoinUrl}
          title="Click para copiar la URL"
          style={{
            background: '#fff',
            border: 'none',
            font: 'inherit',
            borderRadius: 12,
            padding: '18px 32px',
            marginBottom: 8,
            textAlign: 'center',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div style={{ fontSize: 18, color: '#666' }}>
            Uníte en <b>{joinUrl}</b> 📋
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 900,
              letterSpacing: 8,
              color: '#1976d2',
            }}
          >
            {state.code}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: copied ? '#388e3c' : '#999',
              minHeight: 20,
            }}
          >
            {copied ? '¡URL copiada!' : 'Click para copiar la URL'}
          </div>
        </button>
        <div style={{ color: '#fff', fontSize: 22, margin: '12px 0 20px' }}>
          {state.players?.length || 0} jugador
          {(state.players?.length || 0) === 1 ? '' : 'es'}
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'center',
            maxWidth: 900,
            marginBottom: 32,
          }}
        >
          {state.players?.map(p => (
            <div
              key={p.padron}
              className="anim-pop-in"
              style={{
                background: 'rgba(255,255,255,0.92)',
                borderRadius: 8,
                padding: '10px 18px',
                fontWeight: 600,
                fontSize: 18,
              }}
            >
              {p.nickname} <span style={{ color: '#888', fontWeight: 400 }}>({p.padron})</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => advance('lobby')}
          disabled={(state.players?.length || 0) === 0}
          style={{
            ...bigBtn,
            opacity: (state.players?.length || 0) === 0 ? 0.5 : 1,
            cursor: (state.players?.length || 0) === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          Comenzar
        </button>
        {error && <ErrorBox text={error} />}
      </Screen>
    );
  }

  if (state.status === 'title') {
    return (
      <Screen>
        <div className="anim-fade-in-scale" style={{ textAlign: 'center' }}>
          <div
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 26,
              marginBottom: 18,
            }}
          >
            ¡Prepárense!
          </div>
          <h1 style={{ color: '#fff', fontSize: 64, margin: 0 }}>{state.quizName}</h1>
          <div
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 22,
              marginTop: 18,
            }}
          >
            {state.totalQuestions} preguntas
          </div>
        </div>
      </Screen>
    );
  }

  if (state.status === 'question' || state.status === 'reveal') {
    // Guard por si el poll todavía no trajo el payload de la pregunta
    if (!state.question || !state.options) {
      return (
        <Screen>
          <div style={{ color: '#fff', fontSize: 24 }}>Cargando...</div>
        </Screen>
      );
    }
    const q = state.question;
    const reveal = state.status === 'reveal';
    const maxCount = Math.max(1, ...(state.options?.map(o => o.answerCount || 0) || [1]));
    return (
      <Screen align="stretch">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            marginBottom: 18,
          }}
        >
          <div style={{ color: '#fff', fontSize: 20, fontWeight: 600 }}>
            Pregunta {(state.questionIndex ?? 0) + 1} de {state.totalQuestions}
          </div>
          {!reveal && (
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 600 }}>
              {state.answeredCount}/{Math.max(state.activeCount || 0, state.answeredCount || 0)} respondieron
            </div>
          )}
        </div>

        <div
          className="anim-slide-up"
          style={{
            background: '#fff',
            borderRadius: 14,
            padding: '26px 30px',
            textAlign: 'center',
            marginBottom: 22,
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 700 }}>{q.text}</div>
          {q.imageUrl && (
            <img
              src={q.imageUrl}
              alt={q.text ? `Imagen de la pregunta: ${q.text}` : 'Imagen de la pregunta'}
              style={{
                maxHeight: 260,
                maxWidth: '100%',
                marginTop: 18,
                borderRadius: 10,
              }}
            />
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 22,
          }}
        >
          {!reveal ? (
            <Countdown remainingMs={state.remainingMs || 0} totalMs={q.timeLimit * 1000} />
          ) : (
            <button onClick={() => advance('reveal')} style={bigBtn}>
              Siguiente
            </button>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
            width: '100%',
          }}
        >
          {state.options?.map((o, i) => (
            <div
              key={o.id}
              style={{
                background: OPTION_COLORS[i % 4],
                opacity: reveal && !o.isCorrect ? 0.35 : 1,
                borderRadius: 10,
                padding: '22px 24px',
                color: '#fff',
                fontSize: 24,
                fontWeight: 700,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                outline: reveal && o.isCorrect ? '5px solid #fff' : 'none',
              }}
            >
              <span>
                {reveal && o.isCorrect ? '✓ ' : ''}
                {o.text}
              </span>
              {reveal && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      height: 14,
                      borderRadius: 7,
                      background: 'rgba(255,255,255,0.85)',
                      width: Math.round(120 * ((o.answerCount || 0) / maxCount)),
                    }}
                  />
                  {o.answerCount}
                </span>
              )}
            </div>
          ))}
        </div>
        {error && <ErrorBox text={error} />}
      </Screen>
    );
  }

  if (state.status === 'leaderboard') {
    return (
      <Screen>
        <h1 style={{ color: '#fff', fontSize: 42, marginBottom: 6 }}>Podio</h1>
        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 20, fontWeight: 600, marginBottom: 28 }}>
          Pregunta {(state.questionIndex ?? 0) + 1} de {state.totalQuestions}
        </div>
        <div style={{ width: '100%', maxWidth: 620 }}>
          {state.leaderboard?.map((p, i) => (
            <div
              key={p.padron}
              className="anim-slide-up"
              style={{
                animationDelay: `${i * 0.12}s`,
                background: '#fff',
                borderRadius: 10,
                padding: '14px 22px',
                marginBottom: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              <span>
                {p.rank <= 3 ? MEDALS[p.rank - 1] : `${p.rank}.`} {p.nickname} <span style={{ color: '#888', fontWeight: 400, fontSize: 17 }}>({p.padron})</span>
              </span>
              <span style={{ color: '#1976d2' }}>{p.score}</span>
            </div>
          ))}
        </div>
        <button onClick={() => advance('leaderboard')} style={{ ...bigBtn, marginTop: 24 }}>
          Siguiente
        </button>
        {error && <ErrorBox text={error} />}
      </Screen>
    );
  }

  // podium
  const podium = state.leaderboard?.slice(0, 3) || [];
  const heights = [240, 180, 140];
  const order = [1, 0, 2]; // 2do, 1ro, 3ro (posiciones visuales)
  return (
    <Screen>
      {podiumStage >= 3 && <Confetti />}
      <h1 className="anim-fade-in-scale" style={{ color: '#fff', fontSize: 46, marginBottom: 10 }}>
        🏆 Podio final
      </h1>
      <div
        style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: 22,
          marginBottom: 36,
        }}
      >
        {state.quizName}
      </div>
      {podiumStage === 0 ? (
        <div
          style={{
            textAlign: 'center',
            height: 340,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div className="anim-drum" style={{ fontSize: 90 }}>
            🥁
          </div>
          <div
            className="anim-pulse"
            style={{
              color: '#fff',
              fontSize: 30,
              fontWeight: 700,
              marginTop: 18,
            }}
          >
            Y los ganadores son...
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
          {order.map(pos => {
            const p = podium[pos];
            const visible = podiumStage >= 3 - pos;
            const isWinner = pos === 0;
            return (
              <div
                key={pos}
                style={{
                  width: 220,
                  textAlign: 'center',
                  visibility: visible ? 'visible' : 'hidden',
                }}
              >
                {p && visible && (
                  <div className="anim-podium-rise">
                    {isWinner && (
                      <div className="anim-pop-in" style={{ fontSize: 40, marginBottom: -6 }}>
                        👑
                      </div>
                    )}
                    <div style={{ fontSize: 54 }}>{MEDALS[pos]}</div>
                    <div
                      style={{
                        color: '#fff',
                        fontSize: isWinner ? 32 : 26,
                        fontWeight: 800,
                        marginBottom: 4,
                      }}
                    >
                      {p.nickname}
                    </div>
                    <div
                      style={{
                        color: 'rgba(255,255,255,0.85)',
                        fontSize: 17,
                        marginBottom: 10,
                      }}
                    >
                      ({p.padron})
                    </div>
                    <div
                      className={isWinner ? 'anim-glow' : undefined}
                      style={{
                        background: pos === 0 ? '#ffd54f' : pos === 1 ? '#e0e0e0' : '#bf8970',
                        height: heights[pos],
                        borderRadius: '10px 10px 0 0',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        paddingTop: 16,
                        fontSize: 28,
                        fontWeight: 900,
                        color: '#333',
                      }}
                    >
                      {p.score}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {podiumStage >= 4 && (
        <div className="anim-slide-up" style={{ marginTop: 36, display: 'flex', gap: 14 }}>
          <button onClick={() => router.push(`/admin/games/${gameId}`)} style={bigBtn}>
            Ver detalle
          </button>
          <button
            onClick={() => router.push('/admin')}
            style={{
              ...bigBtn,
              background: 'rgba(255,255,255,0.25)',
              color: '#fff',
            }}
          >
            Volver
          </button>
        </div>
      )}
    </Screen>
  );
};

const CONFETTI_COLORS = ['#ffd54f', '#e21b3c', '#1368ce', '#26890c', '#ff8f00', '#ab47bc', '#fff'];

const Confetti: React.FC = () => {
  // Piezas con posición/tamaño/delay aleatorios, estables entre renders
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        left: Math.random() * 100,
        size: 7 + Math.random() * 9,
        delay: Math.random() * 2.5,
        duration: 2.8 + Math.random() * 2.5,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: Math.random() > 0.5,
      })),
    [],
  );
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 10,
      }}
    >
      {pieces.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.round ? 1 : 0.45),
            background: p.color,
            borderRadius: p.round ? '50%' : 2,
            animation: `confettiFall ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
};

const Screen: React.FC<{ children: React.ReactNode; align?: string }> = ({ children, align = 'center' }) => (
  <div
    style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: align as any,
      justifyContent: 'center',
      padding: '32px 40px',
    }}
  >
    <MuteButton />
    {children}
  </div>
);

const ErrorBox: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      marginTop: 18,
      color: '#fff',
      background: 'rgba(211,47,47,0.9)',
      borderRadius: 6,
      padding: '10px 18px',
      fontWeight: 500,
    }}
  >
    {text}
  </div>
);

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAdminSSR(ctx);
}

export default HostGame;
