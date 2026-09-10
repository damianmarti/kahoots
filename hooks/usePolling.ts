import { useCallback, useEffect, useRef, useState } from 'react';

// 5 minutos sin cambios en pantalla = pestaña olvidada abierta
const DEFAULT_IDLE_MS = 5 * 60 * 1000;

export interface PollOutcome {
  // El juego terminó (o ya no existe): no va a haber más cambios, se corta el polling
  done?: boolean;
  // Resumen de lo que se ve en pantalla; si no cambia en idleMs se pausa por inactividad
  fingerprint?: string;
}

interface PollingOptions {
  enabled: boolean;
  intervalMs: number;
  idleMs?: number;
}

// Polling que no mantiene despierta la base de más (Neon cobra por horas de
// compute encendido y lo apaga recién a los 5 min sin consultas):
// - se corta cuando el tick informa que el juego terminó
// - se pausa mientras la pestaña está oculta y retoma al volver a ella
// - se pausa si el estado no cambia en idleMs; `idle` queda en true hasta `resume()`
// Los ticks no se superponen: el próximo se agenda cuando termina el anterior.
export function usePolling(tick: () => Promise<PollOutcome | undefined>, { enabled, intervalMs, idleMs = DEFAULT_IDLE_MS }: PollingOptions) {
  const [idle, setIdle] = useState(false);
  const tickRef = useRef(tick);
  tickRef.current = tick;
  const lastChange = useRef(Date.now());

  useEffect(() => {
    if (!enabled || idle) return;
    let active = true;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastFingerprint: string | undefined;
    lastChange.current = Date.now();

    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const run = async () => {
      if (!active || running || document.hidden) return;
      clear();
      running = true;
      const startedAt = Date.now();
      let outcome: PollOutcome | undefined;
      try {
        outcome = await tickRef.current();
      } catch {
        /* reintenta en el próximo tick */
      } finally {
        running = false;
      }
      if (!active) return;
      if (outcome?.done) {
        active = false;
        return;
      }
      if (outcome?.fingerprint !== undefined && outcome.fingerprint !== lastFingerprint) {
        lastFingerprint = outcome.fingerprint;
        lastChange.current = Date.now();
      }
      if (Date.now() - lastChange.current > idleMs) {
        setIdle(true);
        return;
      }
      if (!document.hidden) timer = setTimeout(run, Math.max(0, intervalMs - (Date.now() - startedAt)));
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        clear();
      } else {
        lastChange.current = Date.now(); // volver a la pestaña cuenta como actividad
        run();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    run();
    return () => {
      active = false;
      clear();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, idle, intervalMs, idleMs]);

  const resume = useCallback(() => setIdle(false), []);

  // Tick inmediato por fuera del ciclo (ej: después de que el host avanza de fase)
  const pollNow = useCallback(async () => {
    lastChange.current = Date.now();
    await tickRef.current();
  }, []);

  return { idle, resume, pollNow };
}
