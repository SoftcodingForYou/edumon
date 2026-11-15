// Retro sound effects and little original chiptune melodies (Web Audio API).

let ctx: AudioContext | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let soundOn = true;
let musicOn = true;
let noiseBuf: AudioBuffer | null = null;
let unlocked = false; // browsers only allow audio after a user gesture

function ensure(): AudioContext | null {
  if (typeof window === 'undefined' || !unlocked) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.2;
    sfxGain.connect(master);
    musicGain = ctx.createGain();
    musicGain.gain.value = musicOn ? 0.1 : 0;
    musicGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Call from a user gesture so browsers allow sound. */
export function unlockAudio() {
  unlocked = true;
  ensure();
  if (pendingTune) {
    const t = pendingTune;
    pendingTune = null;
    playMusic(t);
  }
}

export function setSoundEnabled(on: boolean) {
  soundOn = on;
}

export function setMusicEnabled(on: boolean) {
  musicOn = on;
  if (musicGain && ctx) musicGain.gain.setTargetAtTime(on ? 0.1 : 0, ctx.currentTime, 0.05);
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.6, slideTo?: number, dest?: GainNode | null) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.008);
  g.gain.setValueAtTime(vol, start + Math.max(0.01, dur * 0.6));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g);
  g.connect(dest ?? sfxGain!);
  o.start(start);
  o.stop(start + dur + 0.03);
}

function noise(start: number, dur: number, vol: number, freq: number, freqTo?: number) {
  if (!ctx || !noiseBuf) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(freq, start);
  if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, start + dur);
  f.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f);
  f.connect(g);
  g.connect(sfxGain!);
  src.start(start);
  src.stop(start + dur + 0.02);
}

export type Sfx =
  | 'move'
  | 'ok'
  | 'back'
  | 'bump'
  | 'rustle'
  | 'encounter'
  | 'hit'
  | 'super'
  | 'weak'
  | 'throw'
  | 'wobble'
  | 'caught'
  | 'breakout'
  | 'flee'
  | 'newdex'
  | 'faint'
  | 'error'
  | 'type';

export function sfx(name: Sfx) {
  if (!soundOn) return;
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + 0.01;
  switch (name) {
    case 'move':
      tone(990, t, 0.035, 'square', 0.35);
      break;
    case 'type':
      tone(1320, t, 0.03, 'square', 0.25);
      break;
    case 'ok':
      tone(784, t, 0.06, 'square', 0.45);
      tone(1175, t + 0.06, 0.09, 'square', 0.45);
      break;
    case 'back':
      tone(660, t, 0.06, 'square', 0.4);
      tone(440, t + 0.06, 0.09, 'square', 0.4);
      break;
    case 'error':
      tone(220, t, 0.12, 'square', 0.45);
      tone(196, t + 0.13, 0.18, 'square', 0.45);
      break;
    case 'bump':
      tone(120, t, 0.07, 'square', 0.4);
      break;
    case 'rustle':
      noise(t, 0.08, 0.25, 3000);
      break;
    case 'encounter':
      [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, t + i * 0.055, 0.06, 'square', 0.4));
      break;
    case 'hit':
      noise(t, 0.16, 0.9, 1400, 400);
      tone(200, t, 0.12, 'square', 0.35, 70);
      break;
    case 'super':
      noise(t, 0.2, 1, 1800, 300);
      tone(220, t, 0.12, 'square', 0.4, 70);
      tone(1320, t + 0.12, 0.08, 'square', 0.35);
      tone(1760, t + 0.2, 0.12, 'square', 0.35);
      break;
    case 'weak':
      noise(t, 0.1, 0.5, 900, 500);
      break;
    case 'throw':
      noise(t, 0.4, 0.6, 400, 2400);
      break;
    case 'wobble':
      tone(330, t, 0.05, 'square', 0.4);
      tone(262, t + 0.07, 0.06, 'square', 0.4);
      break;
    case 'caught':
      [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.08, 0.09, 'square', 0.4));
      tone(1568, t + 0.36, 0.3, 'triangle', 0.6);
      tone(2093, t + 0.36, 0.3, 'square', 0.25);
      break;
    case 'breakout':
      tone(900, t, 0.2, 'square', 0.4, 180);
      noise(t, 0.15, 0.6, 2000);
      break;
    case 'flee':
      [880, 660, 440, 330].forEach((f, i) => tone(f, t + i * 0.05, 0.05, 'square', 0.35));
      break;
    case 'newdex':
      [784, 1047, 1319, 1568].forEach((f, i) => tone(f, t + i * 0.1, 0.1, 'square', 0.4));
      tone(2093, t + 0.4, 0.4, 'triangle', 0.6);
      break;
    case 'faint':
      tone(700, t, 0.5, 'square', 0.4, 90);
      break;
  }
}

/** A different little sound for every attack type. */
export function attackSfx(type: string) {
  if (!soundOn) return;
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + 0.01;
  switch (type) {
    case 'fuego':
      noise(t, 0.45, 0.8, 500, 2600);
      tone(110, t, 0.4, 'sawtooth', 0.25, 70);
      break;
    case 'agua':
      for (let i = 0; i < 6; i++) tone(500 + Math.random() * 500, t + i * 0.06, 0.07, 'sine', 0.5, 1300 + Math.random() * 400);
      break;
    case 'planta':
      noise(t, 0.35, 0.5, 3200, 1400);
      tone(880, t + 0.05, 0.12, 'triangle', 0.3, 1320);
      break;
    case 'electrico':
      [880, 1320, 660, 1760, 990].forEach((f, i) => tone(f, t + i * 0.035, 0.04, 'square', 0.3));
      noise(t + 0.2, 0.15, 0.7, 4200);
      break;
    case 'hielo':
      [2093, 2637, 3136, 2637].forEach((f, i) => tone(f, t + i * 0.06, 0.08, 'triangle', 0.35));
      break;
    case 'roca':
      [0, 0.09, 0.18, 0.27].forEach((d) => tone(95, t + d, 0.12, 'square', 0.4, 50));
      noise(t + 0.3, 0.2, 0.6, 300);
      break;
    case 'aire':
      noise(t, 0.25, 0.6, 700, 3200);
      noise(t + 0.25, 0.25, 0.5, 3200, 700);
      break;
    case 'bicho':
      for (let i = 0; i < 8; i++) tone(i % 2 ? 190 : 165, t + i * 0.04, 0.045, 'sawtooth', 0.25);
      break;
    case 'fantasma':
      tone(620, t, 0.55, 'sine', 0.45, 180);
      tone(640, t + 0.04, 0.5, 'sine', 0.3, 200);
      break;
    case 'lucha':
      tone(160, t + 0.2, 0.18, 'square', 0.5, 55);
      noise(t + 0.2, 0.15, 0.9, 260);
      break;
    case 'dragon':
      tone(130, t, 0.55, 'sawtooth', 0.4, 65);
      noise(t, 0.5, 0.5, 450, 900);
      break;
    case 'magia':
      [1568, 2093, 2637, 3136, 4186].forEach((f, i) => tone(f, t + i * 0.05, 0.08, 'sine', 0.3));
      break;
    default:
      noise(t, 0.12, 0.6, 2200, 700);
  }
}

// ------------------------------------------------------------------ music

type Note = [string | null, number]; // [pitch like "C5" or null = rest, length in eighth notes]
interface Tune {
  bpm: number;
  lead: Note[];
  bass: Note[];
}

const parse = (s: string): Note[] =>
  s
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [p, l] = tok.split(':');
      return [p === '-' ? null : p, Number(l ?? 1)];
    });

// All melodies are original compositions for this game.
export const TUNES: Record<string, Tune> = {
  title: {
    bpm: 104,
    lead: parse(`E5:2 G5:2 C6:4 B5:2 A5:2 G5:4 F5:2 A5:2 G5:2 E5:2 D5:4 -:4
                 E5:2 G5:2 C6:4 D6:2 C6:2 B5:4 A5:2 G5:2 F5:2 D5:2 C5:6 -:2`),
    bass: parse(`C3:4 G3:4 C3:4 E3:4 F3:4 G3:4 G2:4 B2:4
                 C3:4 G3:4 E3:4 G3:4 F3:4 G3:4 C3:8`),
  },
  world: {
    bpm: 126,
    lead: parse(`G4 B4 D5:2 B4 D5 G5:2 F#5 E5 D5:2 B4:2 A4:2 C5 E5 G5:2 E5 C5 A4:2 B4 D5 G4:2 -:4
                 E5 F#5 G5:2 A5 G5 E5:2 D5 B4 D5:2 G5:2 D5:2 C5 D5 E5:2 F#5 A5 F#5:2 G5:4 -:4`),
    bass: parse(`G2:2 G3:2 G2:2 G3:2 D3:2 D2:2 D3:2 D2:2 C3:2 C2:2 C3:2 C2:2 G2:2 G3:2 G2:2 G3:2
                 C3:2 C2:2 C3:2 C2:2 G2:2 G3:2 G2:2 G3:2 D3:2 D2:2 D3:2 D2:2 G2:2 D3:2 G2:4`),
  },
  battle: {
    bpm: 152,
    lead: parse(`A4 C5 E5 A5 G5 E5 C5 E5 F4 A4 C5 F5 E5 C5 A4 C5 G4 B4 D5 G5 F5 D5 B4 D5 E5:2 D5 C5 B4:2 G#4:2
                 A4 C5 E5 A5 B5 A5 G5 E5 F5:2 E5 D5 C5:2 A4:2 D5 E5 F5 D5 B4 C5 D5 B4 A4:2 E4:2 A4:4`),
    bass: parse(`A2 A2 A3 A2 A2 A2 A3 A2 F2 F2 F3 F2 F2 F2 F3 F2 G2 G2 G3 G2 G2 G2 G3 G2 E2 E2 E3 E2 E2 E2 E3 E2
                 A2 A2 A3 A2 A2 A2 A3 A2 F2 F2 F3 F2 F2 F2 F3 F2 D2 D2 D3 D2 E2 E2 E3 E2 A2 A2 A3 A2 A2:4`),
  },
};

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function freqOf(p: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(p);
  if (!m) return 440;
  const semis = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = (Number(m[3]) + 1) * 12 + semis;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface Voice {
  notes: Note[];
  idx: number;
  time: number;
  type: OscillatorType;
  vol: number;
}

let current: { name: string; tune: Tune; voices: Voice[] } | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let pendingTune: string | null = null;

function schedule() {
  if (!ctx || !current) return;
  const eighth = 60 / current.tune.bpm / 2;
  const horizon = ctx.currentTime + 0.3;
  for (const v of current.voices) {
    while (v.time < horizon) {
      const [p, len] = v.notes[v.idx];
      const dur = len * eighth;
      if (p) tone(freqOf(p), v.time, dur * 0.92, v.type, v.vol, undefined, musicGain);
      v.time += dur;
      v.idx = (v.idx + 1) % v.notes.length;
    }
  }
}

export function playMusic(name: keyof typeof TUNES | string) {
  if (current?.name === name) return;
  const tune = TUNES[name];
  if (!tune) return;
  if (!ctx || ctx.state !== 'running') {
    pendingTune = name;
    if (!ctx) return;
  }
  const start = ctx.currentTime + 0.1;
  current = {
    name,
    tune,
    voices: [
      { notes: tune.lead, idx: 0, time: start, type: 'square', vol: 0.32 },
      { notes: tune.bass, idx: 0, time: start, type: 'triangle', vol: 0.7 },
    ],
  };
  if (!timer) timer = setInterval(schedule, 60);
  schedule();
}

export function stopMusic() {
  current = null;
  pendingTune = null;
}
