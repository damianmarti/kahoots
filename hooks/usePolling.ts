import { useCallback, useEffect, useRef, useState } from 'react';

// 5 minutos sin cambios en pantalla ni interacción = pestaña olvidada abierta
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
  // Cuánto sigue polleando con la pestaña oculta antes de pausarse (0 = enseguida)
  hiddenGraceMs?: number;
}

// Polling que no mantiene despierta la base de más (Neon cobra por horas de
// compute encendido y lo apaga recién a los 5 min sin consultas):
// - se corta cuando el tick informa que el juego terminó
// - se pausa con la pestaña oculta (pasado hiddenGraceMs) y retoma al volver a ella
// - se pausa si en idleMs no cambia lo que se ve ni hay toques o teclas;
//   `idle` queda en true hasta `resume()`
// Los ticks no se superponen: el próximo se agenda cuando termina el anterior.
export function usePolling(tick: () => Promise<PollOutcome | undefined>, { enabled, intervalMs, idleMs = DEFAULT_IDLE_MS, hiddenGraceMs = 0 }: PollingOptions) {
  const [idle, setIdle] = useState(false);
  const tickRef = useRef(tick);
  tickRef.current = tick;
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    if (!enabled || idle) return;
    let active = true;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastFingerprint: string | undefined;
    let hiddenSince: number | null = document.hidden ? Date.now() : null;
    lastActivity.current = Date.now();

    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const markActivity = () => {
      lastActivity.current = Date.now();
    };
    const pausedByVisibility = () => hiddenSince !== null && Date.now() - hiddenSince >= hiddenGraceMs;

    const run = async () => {
      if (!active || running || pausedByVisibility()) return;
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
        markActivity();
      }
      if (Date.now() - lastActivity.current > idleMs) {
        setIdle(true);
        return;
      }
      if (!pausedByVisibility()) timer = setTimeout(run, Math.max(0, intervalMs - (Date.now() - startedAt)));
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenSince = Date.now();
      } else {
        hiddenSince = null;
        markActivity(); // volver a la pestaña cuenta como actividad
        run();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    // Tocar o tipear también (ej: "Siguiente" en el host durante la cuenta regresiva)
    document.addEventListener('pointerdown', markActivity);
    document.addEventListener('keydown', markActivity);
    run();
    return () => {
      active = false;
      clear();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('pointerdown', markActivity);
      document.removeEventListener('keydown', markActivity);
    };
  }, [enabled, idle, intervalMs, idleMs, hiddenGraceMs]);

  const resume = useCallback(() => setIdle(false), []);

  // Tick inmediato por fuera del ciclo (ej: después de que el host avanza de fase)
  const pollNow = useCallback(async () => {
    lastActivity.current = Date.now();
    await tickRef.current();
  }, []);

  return { idle, resume, pollNow };
}
