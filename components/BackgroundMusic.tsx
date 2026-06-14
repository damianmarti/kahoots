import React, { useEffect, useRef, useState } from 'react';

// Música de fondo estilo MIDI para la pantalla del host: "The Entertainer"
// de Scott Joplin (1902, dominio público), el tema de la película El golpe.
// Secuenciado con Web Audio (osciladores), sin archivos ni dependencias.

// [pitch MIDI, inicio en corcheas, duración en corcheas]
// Melodía: sección A del rag, transcripción simplificada en Do mayor
const MELODY: [number, number, number][] = [
  // Frase 1
  [62, 0, 1], [63, 1, 1], [64, 2, 1], [72, 3, 2], [64, 5, 1], [72, 6, 2], [64, 8, 1], [72, 9, 3],
  [72, 12, 1], [74, 13, 1], [75, 14, 1], [76, 15, 1], [72, 16, 1], [74, 17, 1], [76, 18, 2],
  [71, 20, 1], [74, 21, 2], [72, 23, 4],
  // Frase 2
  [62, 28, 1], [63, 29, 1], [64, 30, 1], [72, 31, 2], [64, 33, 1], [72, 34, 2], [64, 36, 1], [72, 37, 3],
  [69, 40, 1], [67, 41, 1], [66, 42, 1], [69, 43, 1], [72, 44, 1], [76, 45, 2],
  [74, 47, 1], [72, 48, 1], [69, 49, 1], [74, 50, 4],
  // Frase 3
  [62, 56, 1], [63, 57, 1], [64, 58, 1], [72, 59, 2], [64, 61, 1], [72, 62, 2], [64, 64, 1], [72, 65, 3],
  [72, 68, 1], [74, 69, 1], [75, 70, 1], [76, 71, 1], [72, 72, 1], [74, 73, 1], [76, 74, 2],
  [71, 76, 1], [74, 77, 2], [72, 79, 2],
  // Frase 4 (cierre)
  [76, 81, 1], [72, 82, 1], [74, 83, 1], [76, 84, 1], [72, 85, 1], [74, 86, 1], [72, 87, 2],
  [62, 89, 1], [63, 90, 1], [64, 91, 1], [72, 92, 1], [74, 93, 1], [76, 94, 1],
  [71, 95, 1], [74, 96, 1], [72, 97, 4],
];

// Bajo oom-pah de ragtime: fundamental en el pulso, quinta a contratiempo
const BASS: [number, number, number][] = [];
for (let bar = 0; bar < 26; bar++) {
  const t = bar * 4;
  // Armonía aproximada: D7 al final de la frase 2, G7 en las cadencias
  const root = t >= 44 && t < 52 ? 50 : t % 28 >= 20 && t % 28 < 24 ? 43 : 48;
  BASS.push([root - 12, t, 1], [root - 5, t + 2, 1]);
}

const EIGHTH_SEC = 0.22;
const LOOP_EIGHTHS = 104;

function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

const BackgroundMusic: React.FC = () => {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedOnce = useRef(false);

  const scheduleNote = (ctx: AudioContext, when: number, pitch: number, durEighths: number, volume: number, type: OscillatorType) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2200;
    osc.type = type;
    osc.frequency.value = midiToFreq(pitch);
    const dur = durEighths * EIGHTH_SEC;
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(volume, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur * 0.95);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(when);
    osc.stop(when + dur);
  };

  const scheduleLoop = (ctx: AudioContext, startTime: number) => {
    for (const [pitch, t, d] of MELODY) scheduleNote(ctx, startTime + t * EIGHTH_SEC, pitch, d, 0.055, 'square');
    for (const [pitch, t, d] of BASS) scheduleNote(ctx, startTime + t * EIGHTH_SEC, pitch, d, 0.045, 'triangle');
    const nextStart = startTime + LOOP_EIGHTHS * EIGHTH_SEC;
    timerRef.current = setTimeout(() => scheduleLoop(ctx, nextStart), (nextStart - ctx.currentTime - 1) * 1000);
  };

  const start = () => {
    if (ctxRef.current) return;
    const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    ctxRef.current = ctx;
    scheduleLoop(ctx, ctx.currentTime + 0.1);
    setPlaying(true);
  };

  const stop = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
    setPlaying(false);
  };

  // Los browsers bloquean el audio hasta el primer gesto del usuario:
  // arranca solo con el primer click/tap en la pantalla del host
  useEffect(() => {
    const onFirstGesture = () => {
      if (!startedOnce.current) {
        startedOnce.current = true;
        start();
      }
    };
    document.addEventListener('pointerdown', onFirstGesture, { once: true });
    return () => {
      document.removeEventListener('pointerdown', onFirstGesture);
      stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <button
      onClick={e => {
        e.stopPropagation();
        startedOnce.current = true;
        playing ? stop() : start();
      }}
      title={playing ? 'Silenciar música' : 'Música de fondo'}
      style={{
        position: 'fixed', top: 16, right: 16, zIndex: 20,
        background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
        width: 48, height: 48, fontSize: 22, cursor: 'pointer',
      }}
    >
      {playing ? '🎵' : '🔇'}
    </button>
  );
};

export default BackgroundMusic;
