// Motor de audio del host: música por fase y efectos de sonido, sintetizados
// con Web Audio (osciladores) — sin archivos ni dependencias.
//
// Es un singleton a nivel de módulo (un único AudioContext) para que la música
// y el estado de silencio sobrevivan a los remounts de React entre fases.
// La música arranca recién tras el primer gesto del usuario (resume()), por el
// bloqueo de autoplay de los browsers.

type LoopName = 'lobby' | 'suspense' | 'podium';
type SfxName = 'ready' | 'timeUp' | 'correct' | 'winner' | 'fanfare' | 'drumroll';

// [pitch MIDI, inicio en corcheas, duración en corcheas]
type Seq = [number, number, number][];
// [pitch MIDI, inicio en seg, duración en seg]
type SfxSeq = [number, number, number][];

const EIGHTH_SEC = 0.22;
const MUTE_KEY = 'hostAudioMuted';

function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

// ---------------------------------------------------------------------------
// Música en loop por fase
// ---------------------------------------------------------------------------

// Lobby: "The Entertainer" de Scott Joplin (1902, dominio público).
const LOBBY_MELODY: Seq = [
  [62, 0, 1], [63, 1, 1], [64, 2, 1], [72, 3, 2], [64, 5, 1], [72, 6, 2], [64, 8, 1], [72, 9, 3],
  [72, 12, 1], [74, 13, 1], [75, 14, 1], [76, 15, 1], [72, 16, 1], [74, 17, 1], [76, 18, 2], [71, 20, 1], [74, 21, 2], [72, 23, 4],
  [62, 28, 1], [63, 29, 1], [64, 30, 1], [72, 31, 2], [64, 33, 1], [72, 34, 2], [64, 36, 1], [72, 37, 3],
  [69, 40, 1], [67, 41, 1], [66, 42, 1], [69, 43, 1], [72, 44, 1], [76, 45, 2], [74, 47, 1], [72, 48, 1], [69, 49, 1], [74, 50, 4],
  [62, 56, 1], [63, 57, 1], [64, 58, 1], [72, 59, 2], [64, 61, 1], [72, 62, 2], [64, 64, 1], [72, 65, 3],
  [72, 68, 1], [74, 69, 1], [75, 70, 1], [76, 71, 1], [72, 72, 1], [74, 73, 1], [76, 74, 2], [71, 76, 1], [74, 77, 2], [72, 79, 2],
  [76, 81, 1], [72, 82, 1], [74, 83, 1], [76, 84, 1], [72, 85, 1], [74, 86, 1], [72, 87, 2],
  [62, 89, 1], [63, 90, 1], [64, 91, 1], [72, 92, 1], [74, 93, 1], [76, 94, 1], [71, 95, 1], [74, 96, 1], [72, 97, 4],
];
const LOBBY_BASS: Seq = (() => {
  const out: Seq = [];
  for (let bar = 0; bar < 26; bar++) {
    const t = bar * 4;
    const root = t >= 44 && t < 52 ? 50 : t % 28 >= 20 && t % 28 < 24 ? 43 : 48;
    out.push([root - 12, t, 1], [root - 5, t + 2, 1]);
  }
  return out;
})();

// Suspenso: ostinato tenso en La menor mientras la pregunta está abierta.
const SUSPENSE_MELODY: Seq = [
  [76, 0, 2], [74, 2, 2], [72, 4, 2], [71, 6, 2],
  [69, 8, 2], [71, 10, 2], [72, 12, 2], [74, 14, 2],
];
const SUSPENSE_BASS: Seq = [
  [45, 0, 1], [45, 2, 1], [45, 4, 1], [45, 6, 1],
  [45, 8, 1], [45, 10, 1], [45, 12, 1], [45, 14, 1],
];

// Podio: loop alegre y brillante en Do mayor.
const PODIUM_MELODY: Seq = [
  [72, 0, 2], [76, 2, 2], [79, 4, 2], [84, 6, 2], [83, 8, 1], [81, 9, 1], [79, 10, 2], [76, 12, 2],
  [77, 14, 2], [81, 16, 2], [84, 18, 2], [88, 20, 2], [86, 22, 2], [84, 24, 2], [83, 26, 1], [81, 27, 1], [79, 28, 4],
];
const PODIUM_BASS: Seq = (() => {
  const roots = [36, 36, 41, 36, 43, 36, 43, 36];
  const out: Seq = [];
  roots.forEach((root, bar) => {
    out.push([root, bar * 4, 1], [root + 7, bar * 4 + 2, 1]);
  });
  return out;
})();

interface LoopDef {
  melody: Seq;
  bass: Seq;
  eighths: number;
  melVol: number;
  melType: OscillatorType;
  bassVol: number;
  bassType: OscillatorType;
}

const LOOPS: Record<LoopName, LoopDef> = {
  lobby: { melody: LOBBY_MELODY, bass: LOBBY_BASS, eighths: 104, melVol: 0.055, melType: 'square', bassVol: 0.045, bassType: 'triangle' },
  suspense: { melody: SUSPENSE_MELODY, bass: SUSPENSE_BASS, eighths: 16, melVol: 0.04, melType: 'triangle', bassVol: 0.05, bassType: 'triangle' },
  podium: { melody: PODIUM_MELODY, bass: PODIUM_BASS, eighths: 32, melVol: 0.06, melType: 'square', bassVol: 0.05, bassType: 'triangle' },
};

// ---------------------------------------------------------------------------
// Efectos de sonido (one-shot)
// ---------------------------------------------------------------------------

interface SfxDef {
  notes: SfxSeq;
  vol: number;
  type: OscillatorType;
  filter?: number;
}

const SFX: Record<SfxName, SfxDef> = {
  // Sting ascendente al "¡Prepárense!"
  ready: { notes: [[60, 0, 0.1], [64, 0.1, 0.1], [67, 0.2, 0.1], [72, 0.3, 0.3]], vol: 0.08, type: 'triangle' },
  // Bocina descendente al terminar el tiempo
  timeUp: { notes: [[57, 0, 0.18], [53, 0.18, 0.18], [48, 0.36, 0.32]], vol: 0.12, type: 'sawtooth', filter: 4000 },
  // Campanita suave al mostrar la respuesta correcta
  correct: { notes: [[72, 0, 0.12], [76, 0.12, 0.16], [79, 0.28, 0.22]], vol: 0.08, type: 'sine' },
  // Arpegio ascendente al revelar un ganador (2do/3ro)
  winner: { notes: [[72, 0, 0.12], [76, 0.12, 0.12], [79, 0.24, 0.16], [84, 0.36, 0.3]], vol: 0.1, type: 'triangle' },
  // Fanfarria triunfal para el 1er puesto
  fanfare: {
    notes: [
      [67, 0, 0.14], [72, 0.14, 0.14], [76, 0.28, 0.14], [79, 0.42, 0.18],
      [84, 0.6, 0.5], [76, 0.6, 0.5], [79, 0.6, 0.5], [72, 0.6, 0.5],
    ],
    vol: 0.09,
    type: 'square',
  },
  // Redoble de tambor en "Y los ganadores son..."
  drumroll: {
    notes: Array.from({ length: 18 }, (_, i) => [40 + (i % 2) * 2, i * 0.06, 0.05] as [number, number, number]),
    vol: 0.07,
    type: 'triangle',
    filter: 800,
  },
};

// ---------------------------------------------------------------------------
// Motor
// ---------------------------------------------------------------------------

class HostAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private _muted = false;
  private desiredLoop: LoopName | null = null;
  private currentLoop: LoopName | null = null;
  private loopGen = 0;
  private loopTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this._muted = window.localStorage.getItem(MUTE_KEY) === '1';
    }
  }

  get muted(): boolean {
    return this._muted;
  }

  setMuted(muted: boolean) {
    this._muted = muted;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.02);
    }
  }

  // Crea/reanuda el AudioContext. Debe llamarse dentro de un gesto del usuario.
  resume() {
    if (!this.ctx) {
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
    }
    this.ctx.resume?.();
    if (this.desiredLoop && this.desiredLoop !== this.currentLoop) {
      this.startLoop(this.desiredLoop);
    }
  }

  setLoop(name: LoopName | null) {
    this.desiredLoop = name;
    if (!this.ctx) return; // arrancará en resume()
    if (name === this.currentLoop) return;
    this.stopLoopTimer();
    this.loopGen++;
    this.currentLoop = null;
    if (name) this.startLoop(name);
  }

  playSfx(name: SfxName) {
    if (!this.ctx || !this.master) return;
    const def = SFX[name];
    const base = this.ctx.currentTime + 0.03;
    for (const [pitch, start, dur] of def.notes) {
      this.scheduleNote(base + start, pitch, dur, def.vol, def.type, def.filter);
    }
  }

  private stopLoopTimer() {
    if (this.loopTimer) clearTimeout(this.loopTimer);
    this.loopTimer = null;
  }

  private startLoop(name: LoopName) {
    const ctx = this.ctx;
    if (!ctx) return;
    this.stopLoopTimer();
    this.currentLoop = name;
    const gen = ++this.loopGen;
    const def = LOOPS[name];
    const run = (startTime: number) => {
      if (gen !== this.loopGen) return; // loop obsoleto: la fase cambió
      const start = Math.max(startTime, ctx.currentTime + 0.05);
      for (const [pitch, t, d] of def.melody) this.scheduleNote(start + t * EIGHTH_SEC, pitch, d * EIGHTH_SEC, def.melVol, def.melType);
      for (const [pitch, t, d] of def.bass) this.scheduleNote(start + t * EIGHTH_SEC, pitch, d * EIGHTH_SEC, def.bassVol, def.bassType);
      const nextStart = start + def.eighths * EIGHTH_SEC;
      const delayMs = Math.max(0, (nextStart - ctx.currentTime - 1) * 1000);
      this.loopTimer = setTimeout(() => run(nextStart), delayMs);
    };
    run(ctx.currentTime + 0.1);
  }

  private scheduleNote(when: number, pitch: number, durSec: number, volume: number, type: OscillatorType, filterFreq = 2200) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    osc.type = type;
    osc.frequency.value = midiToFreq(pitch);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(volume, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, when + durSec * 0.95);
    osc.connect(filter).connect(gain).connect(master);
    osc.start(when);
    osc.stop(when + durSec);
  }
}

let engine: HostAudio | null = null;

export function getHostAudio(): HostAudio {
  if (!engine) engine = new HostAudio();
  return engine;
}

export type { LoopName, SfxName };
