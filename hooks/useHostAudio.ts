import { useEffect, useRef } from 'react';
import { getHostAudio, type LoopName } from '../lib/audio';

// Maneja la música y los efectos de sonido del host según la fase del juego.
// Se llama una sola vez en HostGame (que no se desmonta durante la partida),
// así el motor de audio persiste a través de todos los cambios de fase.
export function useHostAudio(status: string | undefined, podiumStage: number) {
  const prevStatus = useRef<string | undefined>(undefined);
  const prevStage = useRef(0);

  // Arranca el audio con el primer gesto (autoplay bloqueado por el browser).
  // Al desmontar (ej: salir del host con "Volver") corta la música, que de otro
  // modo seguiría sonando porque el motor es un singleton que sobrevive a la
  // navegación SPA.
  useEffect(() => {
    const onFirstGesture = () => getHostAudio().resume();
    document.addEventListener('pointerdown', onFirstGesture, { once: true });
    return () => {
      document.removeEventListener('pointerdown', onFirstGesture);
      getHostAudio().setLoop(null);
    };
  }, []);

  // Música en loop según la fase.
  useEffect(() => {
    const loop: LoopName | null = status === 'lobby' ? 'lobby' : status === 'question' ? 'suspense' : status === 'podium' ? 'podium' : null;
    getHostAudio().setLoop(loop);
  }, [status]);

  // Efectos de sonido en las transiciones de fase.
  useEffect(() => {
    const audio = getHostAudio();
    const prev = prevStatus.current;
    let t: ReturnType<typeof setTimeout> | null = null;

    if (status && status !== prev) {
      if (status === 'title') audio.playSfx('ready');
      if (status === 'reveal' && prev === 'question') {
        audio.playSfx('timeUp');
        t = setTimeout(() => audio.playSfx('correct'), 700);
      }
      if (status === 'podium') audio.playSfx('drumroll');
      prevStatus.current = status;
    }

    return () => {
      if (t) clearTimeout(t);
    };
  }, [status]);

  // Efectos al revelar cada ganador del podio.
  useEffect(() => {
    if (podiumStage === prevStage.current) return;
    prevStage.current = podiumStage;
    const audio = getHostAudio();
    if (podiumStage === 1 || podiumStage === 2) audio.playSfx('winner');
    if (podiumStage === 3) audio.playSfx('fanfare');
  }, [podiumStage]);
}
