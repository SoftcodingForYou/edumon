// Signature attack animations. Each attack's recipe (game/attacks.ts) becomes a set of
// particles and a few special pieces (beam, whirlwind, jaws, claw marks...). All geometry is
// computed here; the CSS only has generic keyframes driven by variables, and everything is a
// CSS animation (so the attack preview can be recorded frame by frame).

import type { CSSProperties, ReactNode } from 'react';
import { attackHitDelay, attackRecipe, type AttackRecipe, type Particle } from '../game/attacks';
import { ParticleSvg } from './fxParticles';

// Centers of the two fighters on the 768x576 battle stage.
const CENTER = { mine: [204, 282], wild: [570, 130] } as const;

/** Milliseconds from the start of a creature's attack until it hits. */
export const fxHitDelay = (sp: number) => attackHitDelay(attackRecipe(sp));

type Inner = 'none' | 'spin' | 'wobble' | 'arc' | 'grow' | 'flicker' | 'orbit' | 'circle' | 'squash' | 'clamp' | 'swipe' | 'pop' | 'squeeze' | 'tighten' | 'sway';
type Special = '_ring' | '_mound' | '_shield' | '_coil' | '_slash' | '_rays' | '_jaw' | '_funnel';

interface Piece {
  kind: Particle | Special;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  delay: number; // ms after the attack starts
  dur: number;
  ease?: string;
  inner?: Inner;
  px: number; // size in stage pixels
  rot?: number; // degrees
  spin?: number; // degrees turned on the way
  arc?: number; // arc height
  r?: number; // orbit radius
  ph?: number; // orbit phase (degrees)
  grow?: number;
  op?: number;
  keep?: boolean; // stay visible at the end (no fade)
}

// Small fixed offsets so particles don't all fly on the same line.
const SPREAD = [0, -14, 12, -6, 18, -18, 6, 14, -10, 9, -4, 16];
const rnd = (i: number, k = 1) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Particles that look nice turning while they fly. */
const SPINNY = new Set<Particle>(['leaf', 'petal', 'seed', 'thorn', 'shard', 'star', 'feather', 'acorn', 'shell', 'wheel', 'banana', 'spikeball', 'pumpkin', 'confetti', 'wind', 'pebble', 'rock', 'pincer', 'swirl', 'hex', 'comet']);
const WOBBLY = new Set<Particle>(['bubble', 'spore', 'cloud', 'note', 'heart', 'zzz', 'boo', 'dust', 'snow', 'ember']);
const FLICKERY = new Set<Particle>(['flame', 'spark', 'bolt', 'fireball']);
const innerFor = (k: Particle): Inner => (SPINNY.has(k) ? 'spin' : WOBBLY.has(k) ? 'wobble' : FLICKERY.has(k) ? 'flicker' : 'none');

/** Turn a recipe into the pieces to draw, for an attack going from S to T. */
function build(rc: AttackRecipe, S: readonly [number, number], T: readonly [number, number], dir: 1 | -1): Piece[] {
  const [sx, sy] = S;
  const [tx, ty] = T;
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len; // perpendicular to the path
  const ny = dx / len;
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  const n = Math.max(1, rc.count);
  const z = rc.size;
  const px = 40 * z;
  const k = rc.particle;
  const hit = attackHitDelay(rc);
  const out: Piece[] = [];
  const along = (i: number, f: number, amt: number): [number, number] => [sx + dx * f + nx * amt * SPREAD[i % SPREAD.length], sy + dy * f + ny * amt * SPREAD[i % SPREAD.length]];
  // particles bursting from the target at the hit (used by many motions)
  const burstAt = (cnt: number, kind: Particle, size: number, radius: number, delay: number) => {
    for (let i = 0; i < cnt; i++) {
      const a = (i / cnt) * Math.PI * 2 + rnd(i) * 0.5;
      out.push({ kind, ax: tx, ay: ty, bx: tx + Math.cos(a) * radius, by: ty + Math.sin(a) * radius * 0.8, delay, dur: 420, ease: 'ease-out', inner: innerFor(kind), px: size, spin: 240 * (i % 2 ? 1 : -1) });
    }
  };

  switch (rc.motion) {
    case 'shot':
      for (let i = 0; i < n; i++) {
        const [ax, ay] = along(i, 0, 1.1);
        out.push({ kind: k, ax, ay, bx: tx + nx * SPREAD[(i + 3) % 12] * 0.7, by: ty + ny * SPREAD[(i + 3) % 12] * 0.7, delay: i * 50, dur: hit, ease: 'ease-in', inner: innerFor(k), px, rot: ang, spin: 540 });
      }
      break;
    case 'stream':
      for (let i = 0; i < n; i++) {
        const j = (rnd(i) - 0.5) * 26;
        out.push({ kind: k, ax: sx + nx * j * 0.3, ay: sy + ny * j * 0.3, bx: tx + nx * j * 1.6, by: ty + ny * j * 1.6, delay: i * 28, dur: hit, ease: 'linear', inner: 'grow', grow: 1.7, px: px * 0.9, rot: ang + 90 });
      }
      break;
    case 'arc':
      for (let i = 0; i < n; i++) {
        const o = SPREAD[i % 12] * 1.6;
        out.push({ kind: k, ax: sx, ay: sy - 10, bx: tx + o, by: ty + o * 0.3, delay: i * 140, dur: hit, ease: 'linear', inner: 'arc', arc: 120 + i * 10, px, spin: SPINNY.has(k) ? 360 : 0 });
      }
      break;
    case 'spiral':
      for (let i = 0; i < n; i++) {
        out.push({ kind: k, ax: sx, ay: sy, bx: tx, by: ty, delay: i * 35, dur: hit, ease: 'ease-in', inner: 'circle', r: 34 * z, ph: (360 / n) * i, px: px * 0.75 });
      }
      break;
    case 'rain':
      for (let i = 0; i < n; i++) {
        const o = SPREAD[i % 12] * 3.2;
        out.push({ kind: k, ax: tx + o + 30 * dir, ay: ty - 300, bx: tx + o * 0.9, by: ty + rnd(i) * 16 - 8, delay: i * 70, dur: hit, ease: 'cubic-bezier(.4,0,.85,.7)', inner: SPINNY.has(k) ? 'spin' : 'none', spin: 200, px });
      }
      break;
    case 'rise':
      for (let i = 0; i < n; i++) {
        const o = n === 1 ? 0 : SPREAD[i % 12] * 3;
        out.push({ kind: k, ax: tx + o, ay: ty + 80, bx: tx + o, by: ty - 10 - rnd(i, 2) * 40, delay: i * 55, dur: hit + 120, ease: 'cubic-bezier(.2,.9,.3,1.2)', inner: 'grow', grow: 1.25, px, keep: false });
      }
      break;
    case 'meteor': {
      const fx = tx - 390 * dir;
      const fy = Math.max(-40, ty - 260);
      for (let i = 0; i < n; i++) {
        const lead = i === 0;
        out.push({ kind: k, ax: fx, ay: fy, bx: tx, by: ty, delay: i * 45, dur: hit, ease: 'ease-in', inner: lead ? 'flicker' : 'none', px: lead ? px * 1.15 : px * (0.8 - i * 0.1), op: lead ? 1 : 0.65 - i * 0.1, rot: Math.atan2(ty - fy, tx - fx) * (180 / Math.PI) - 45 });
      }
      break;
    }
    case 'float':
      for (let i = 0; i < n; i++) {
        const [ax, ay] = along(i, 0.05, 1.4);
        out.push({ kind: k, ax, ay: ay - 20, bx: tx + SPREAD[(i + 5) % 12] * 1.6, by: ty - 10 + SPREAD[(i + 2) % 12], delay: i * 80, dur: hit, ease: 'ease-in-out', inner: 'wobble', px });
      }
      break;
    case 'cloud':
      for (let i = 0; i < n; i++) {
        const [ax, ay] = along(i, 0.1, 1);
        out.push({ kind: k, ax, ay, bx: tx + SPREAD[(i + 4) % 12] * 2.4, by: ty + SPREAD[(i + 7) % 12] * 1.6, delay: i * 60, dur: hit, ease: 'ease-out', inner: 'grow', grow: 1.9, px: px * 0.8, op: 0.9 });
      }
      break;
    case 'dash':
      for (let i = 0; i < n + 2; i++) {
        const lead = i === 0;
        out.push({ kind: k, ax: sx + 40 * dir, ay: sy - 30, bx: tx, by: ty, delay: i * 40, dur: hit, ease: 'ease-in', inner: lead && SPINNY.has(k) ? 'spin' : 'none', spin: 720, px: lead ? px * 1.4 : px * Math.max(0.4, 1.15 - i * 0.12), op: lead ? 1 : Math.max(0.15, 0.6 - i * 0.09), rot: ang });
      }
      break;
    case 'punch':
      for (let i = 0; i < n; i++) {
        const o = n === 1 ? 0 : i === 0 ? -22 : 22;
        out.push({ kind: k, ax: sx + nx * o + 40 * dir, ay: sy + ny * o - 30, bx: tx + nx * o, by: ty + ny * o, delay: i * 240, dur: hit, ease: 'cubic-bezier(.5,0,.9,.6)', inner: 'grow', grow: 1.35, px: px * 1.25, rot: k === 'horn' ? ang + 90 : dir === 1 ? 0 : 180 });
      }
      break;
    case 'stomp':
      for (let i = 0; i < n; i++) {
        out.push({ kind: k, ax: tx, ay: Math.max(10, ty - 190), bx: tx, by: ty - 12, delay: i * 200, dur: hit, ease: 'cubic-bezier(.55,0,1,.45)', inner: 'squash', px: px * 1.3, keep: true });
      }
      for (let i = 0; i < 4; i++) {
        const s = i % 2 ? 1 : -1;
        out.push({ kind: 'dust', ax: tx + s * 10, ay: ty + 34, bx: tx + s * (60 + i * 14), by: ty + 26 - i * 6, delay: hit, dur: 460, ease: 'ease-out', inner: 'grow', grow: 1.6, px: 30, op: 0.9 });
      }
      break;
    case 'burst':
      out.push({ kind: k, ax: sx, ay: sy, bx: sx, by: sy, delay: 0, dur: hit, inner: 'pop', px: px * 1.2, op: 0.8 });
      burstAt(n, k, px, 90 * z, hit - 40);
      break;
    case 'orbit':
      for (let i = 0; i < n; i++) {
        out.push({ kind: k, ax: tx, ay: ty, bx: tx, by: ty, delay: i * 20, dur: hit + 60, ease: 'ease-in', inner: 'orbit', r: 86 * Math.min(1.3, z), ph: (360 / n) * i, px: px * 0.9 });
      }
      break;
    case 'dig':
      out.push({ kind: '_mound', ax: sx, ay: sy + 70, bx: tx, by: ty + 64, delay: 0, dur: hit, ease: 'ease-in-out', px: 70 * z });
      for (let i = 0; i < n; i++) {
        const o = SPREAD[i % 12] * 2.6;
        out.push({ kind: k, ax: tx + o * 0.3, ay: ty + 60, bx: tx + o, by: ty - 30 - rnd(i) * 40, delay: hit - 60 + i * 25, dur: 460, ease: 'ease-out', inner: 'spin', spin: 300, px });
      }
      break;
    case 'beam':
      out.push({ kind: '_rays', ax: sx, ay: sy, bx: sx, by: sy, delay: 0, dur: hit + 380, px: len, rot: ang, r: 22 * z });
      for (let i = 0; i < n; i++) {
        out.push({ kind: k, ax: sx, ay: sy, bx: tx + SPREAD[i % 12], by: ty + SPREAD[(i + 4) % 12], delay: 40 + i * 45, dur: hit, ease: 'ease-in', inner: innerFor(k), px: px * 0.8, rot: ang, spin: 360 });
      }
      break;
    case 'wave':
      out.push({ kind: k, ax: sx - 60 * dir, ay: sy + 30, bx: tx + 20 * dir, by: ty + 10, delay: 0, dur: hit, ease: 'ease-in-out', inner: 'wobble', px: px * 3, rot: dir === 1 ? 0 : 0 });
      for (let i = 0; i < n; i++) {
        out.push({ kind: k === 'wave' ? 'drop' : k, ax: sx + SPREAD[i % 12] * 2, ay: sy + 20 + SPREAD[(i + 3) % 12], bx: tx + SPREAD[(i + 6) % 12] * 3, by: ty - 20 + SPREAD[i % 12], delay: 80 + i * 50, dur: hit, ease: 'ease-in-out', inner: innerFor(k === 'wave' ? 'drop' : k), px: px * 0.7, spin: 300 });
      }
      break;
    case 'whirl':
      // a funnel of spinning rings, wide at the top
      [1, 0.8, 0.62, 0.46, 0.32].forEach((f, j) => {
        out.push({ kind: '_funnel', ax: sx, ay: sy - 56 + j * 24, bx: tx, by: ty - 56 + j * 24, delay: 0, dur: hit + 160, ease: 'ease-in-out', inner: 'sway', px: 150 * z * f, op: 0.85 });
      });
      for (let i = 0; i < n; i++) {
        out.push({ kind: k, ax: sx, ay: sy - 50 + (i % 4) * 22, bx: tx, by: ty - 50 + (i % 4) * 22, delay: i * 18, dur: hit + 160, ease: 'ease-in-out', inner: 'circle', r: (64 - (i % 4) * 14) * z, ph: (360 / n) * i * 3, px: px * 0.6 });
      }
      break;
    case 'ring':
      for (let i = 0; i < 3; i++) {
        out.push({ kind: '_ring', ax: sx, ay: sy, bx: tx, by: ty, delay: i * 130, dur: hit, ease: 'ease-out', inner: 'grow', grow: 2.4, px: 50 * z, op: 0.9 });
      }
      for (let i = 0; i < n; i++) {
        const [ax, ay] = along(i, 0.1, 1.6);
        out.push({ kind: k, ax, ay, bx: tx + SPREAD[(i + 2) % 12] * 2.4, by: ty + SPREAD[(i + 5) % 12] * 1.5, delay: 60 + i * 110, dur: hit, ease: 'ease-out', inner: 'wobble', px });
      }
      break;
    case 'shield':
      out.push({ kind: '_shield', ax: sx, ay: sy, bx: sx, by: sy, delay: 0, dur: hit + 200, inner: 'pop', px: 150 * z });
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const x = sx + Math.cos(a) * 62 * z;
        const y = sy + Math.sin(a) * 62 * z;
        out.push({ kind: k, ax: x, ay: y, bx: x, by: y, delay: i * 40, dur: hit - 120, inner: 'pop', px: px * 0.9, rot: (a * 180) / Math.PI + 90 });
      }
      out.push({ kind: '_ring', ax: sx, ay: sy, bx: tx, by: ty, delay: hit - 220, dur: 220, ease: 'ease-in', inner: 'grow', grow: 1.6, px: 70 * z, op: 1 });
      break;
    case 'wrap':
      for (let i = 0; i < 3; i++) {
        out.push({ kind: '_coil', ax: tx, ay: ty - 34 + i * 34, bx: tx, by: ty - 34 + i * 34, delay: i * 90, dur: hit + 300, inner: 'tighten', px: 150 * z, rot: -10 + i * 10 });
      }
      for (let i = 0; i < n * 2; i++) {
        out.push({ kind: k, ax: tx, ay: ty, bx: tx, by: ty, delay: i * 30, dur: hit + 120, ease: 'ease-in', inner: 'orbit', r: 70 * z, ph: (360 / (n * 2)) * i, px: px * 0.8 });
      }
      break;
    case 'slash':
      for (let i = 0; i < n; i++) {
        const o = (i - (n - 1) / 2) * 30;
        out.push({ kind: '_slash', ax: tx + o, ay: ty, bx: tx + o, by: ty, delay: 60 + i * 80, dur: 420, inner: 'swipe', px: 150 * z, rot: dir === 1 ? 62 : 118 });
      }
      burstAt(4, k, px * 0.7, 70, hit);
      break;
    case 'bite':
      for (let b = 0; b < n; b++) {
        const d = b * 260;
        if (k === 'pincer' || k === 'shell') {
          out.push({ kind: k, ax: tx, ay: ty, bx: tx, by: ty, delay: d, dur: hit + 120, inner: 'clamp', px: px * 2.6 });
        } else {
          out.push({ kind: '_jaw', ax: tx, ay: ty - 90, bx: tx, by: ty - 14, delay: d, dur: hit, ease: 'cubic-bezier(.6,0,1,.6)', px: 150 * z, rot: 0 });
          out.push({ kind: '_jaw', ax: tx, ay: ty + 90, bx: tx, by: ty + 14, delay: d, dur: hit, ease: 'cubic-bezier(.6,0,1,.6)', px: 150 * z, rot: 180 });
        }
      }
      burstAt(5, k === 'jaw' ? 'spark' : k, px * 0.6, 70, hit);
      break;
    case 'bolt':
      // the bolts themselves are drawn by AttackFx (SVG); here: what falls / sparkles with them
      if (k === 'cloud') out.push({ kind: 'cloud', ax: tx, ay: ty - 230, bx: tx, by: ty - 210, delay: 0, dur: hit + 380, inner: 'pop', px: px * 3.2, op: 0.95 });
      burstAt(6, k === 'cloud' ? 'drop' : k, px * 0.7, 80, hit);
      break;
    case 'flash':
      out.push({ kind: '_rays', ax: sx, ay: sy, bx: sx, by: sy, delay: 0, dur: hit + 300, px: 0, rot: 0, r: 0 });
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const x = tx + Math.cos(a) * 70 * z;
        const y = ty + Math.sin(a) * 55 * z;
        out.push({ kind: k, ax: x, ay: y, bx: x, by: y, delay: hit - 80 + i * 30, dur: 520, inner: 'pop', px });
      }
      break;
    case 'quake':
      for (let i = 0; i < n; i++) {
        const o = SPREAD[i % 12] * 4;
        out.push({ kind: k, ax: tx + o, ay: ty + 66, bx: tx + o * 1.2, by: ty + 10 - rnd(i) * 50, delay: hit - 40 + i * 40, dur: 420, ease: 'ease-out', inner: 'spin', spin: 280, px: px * 0.8 });
      }
      break;
  }
  return out;
}

interface Props {
  from: 'mine' | 'wild';
  sp: number; // the attacking creature (its signature attack)
  strong: boolean; // very effective: bigger impact
  t0?: number; // ms to wait before starting (used by the attack preview)
}

export function AttackFx({ from, sp, strong, t0 = 0 }: Props) {
  const rc = attackRecipe(sp);
  const S = CENTER[from];
  const T = CENTER[from === 'mine' ? 'wild' : 'mine'];
  const dir = from === 'mine' ? 1 : -1;
  const hit = attackHitDelay(rc);
  const pieces = build(rc, S, T, dir);
  const vars = {
    '--sx': `${S[0]}px`,
    '--sy': `${S[1]}px`,
    '--tx': `${T[0]}px`,
    '--ty': `${T[1]}px`,
    '--c1': rc.colors[0],
    '--c2': rc.colors[1],
    '--hit': `${t0 + hit}ms`,
  } as CSSProperties;

  const bolts: ReactNode[] = [];
  if (rc.motion === 'bolt') {
    for (let i = 0; i < rc.count; i++) {
      const o = rc.count === 1 ? 0 : (i - (rc.count - 1) / 2) * 46;
      bolts.push(
        <svg
          key={'b' + i}
          className="fx-bolt"
          viewBox="0 0 60 220"
          width={60 * rc.size}
          height={220 * rc.size}
          style={{ left: T[0] + o - 30 * rc.size, top: T[1] - 205 * rc.size, animationDelay: `${t0 + hit - 120 + i * 110}ms` } as CSSProperties}
        >
          <polyline points="34,0 18,70 38,78 14,150 34,156 24,220" />
        </svg>,
      );
    }
  }

  return (
    <div className={`afx afx-${rc.motion}${strong ? ' afx-strong' : ''}`} style={vars}>
      {rc.motion === 'flash' && <div className="fx-flash" style={{ animationDelay: `${t0 + hit - 120}ms` }} />}
      {rc.motion === 'quake' && (
        <svg className="fx-crack" viewBox="-100 -20 200 40" width={240 * rc.size} height={48} style={{ left: T[0] - 120 * rc.size, top: T[1] + 50, animationDelay: `${t0 + hit - 60}ms` }}>
          <path d="M-96 0L-70-6-52 6-30-8-8 4 14-6 34 8 56-4 76 6 96-2" />
          <path d="M-30-8L-36-18M14-6L20-17M56-4L50 8" />
        </svg>
      )}
      {bolts}
      {pieces.map((p, i) => {
        const style = {
          '--ax': `${p.ax}px`,
          '--ay': `${p.ay}px`,
          '--bx': `${p.bx}px`,
          '--by': `${p.by}px`,
          '--px': `${p.px}px`,
          '--rot': `${p.rot ?? 0}deg`,
          '--spin': `${p.spin ?? 0}deg`,
          '--arc': `${p.arc ?? 0}px`,
          '--r': `${p.r ?? 0}px`,
          '--ph': `${p.ph ?? 0}deg`,
          '--g': p.grow ?? 1.5,
          '--op': p.op ?? 1,
          '--dur': `${p.dur}ms`,
          '--delay': `${t0 + p.delay}ms`,
          '--ease': p.ease ?? 'ease-out',
        } as CSSProperties;
        const special = p.kind.startsWith('_');
        return (
          <i key={i} className={'pt' + (p.keep ? ' keep' : '') + (special ? ' ' + p.kind.slice(1) : '')} style={style}>
            <b className={'pv ' + (p.inner ?? 'none')}>
              {special ? <span className="sp" /> : <ParticleSvg kind={p.kind as Particle} px={p.px} />}
            </b>
          </i>
        );
      })}
      {rc.word && <span className="pow">{rc.word}</span>}
      <div className="impact">
        {Array.from({ length: strong ? 12 : 8 }, (_, i) => (
          <i key={i} style={{ '--a': `${(360 / (strong ? 12 : 8)) * i}deg` } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}

/** Dizzy stars circling above a knocked-out creature's head. */
export function KoStars({ x, y }: { x: number; y: number }) {
  return (
    <div className="ko-stars" style={{ left: x, top: y }} aria-label="K.O.">
      <i />
      <i />
      <i />
    </div>
  );
}
