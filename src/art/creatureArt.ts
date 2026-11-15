// Original creature portraits, built from simple shapes per "archetype".
// Every creature in the game is described by an ArtSpec (see creatures.ts).

import { Art, renderArt, darken, lighten, mix, type EyeStyle, type MouthStyle, type PixelImage } from './raster';

export type Arch =
  | 'quad'
  | 'biped'
  | 'blob'
  | 'bird'
  | 'fish'
  | 'serpent'
  | 'bug'
  | 'winged'
  | 'plant'
  | 'ghost'
  | 'rock'
  | 'shell'
  | 'jelly'
  | 'dragon';

export interface ArtSpec {
  k: Arch; // archetype
  v?: string; // variant
  c: string[]; // colors: body, light/belly, accent, extra
  f?: string[]; // features
  e?: EyeStyle;
  m?: MouthStyle;
  p?: Record<string, number>; // numeric overrides
  s?: number; // drawing scale (set from growth stage)
}

interface Ctx {
  a: Art;
  s: ArtSpec;
  F: Set<string>;
  P: Record<string, number>;
  stage: number;
  eye: EyeStyle;
  mouth: MouthStyle;
}

type Res = { float?: boolean } | void;

const has = (c: Ctx, f: string) => c.F.has(f);
const SIDES = [-1, 1] as const;
const UP = -Math.PI / 2;

export function paletteFor(spec: ArtSpec): Record<string, string> {
  const b = spec.c[0];
  const l = spec.c[1] ?? lighten(b, 0.55);
  const a = spec.c[2] ?? darken(b, 0.25);
  const x = spec.c[3] ?? a;
  return {
    b,
    l,
    a,
    x,
    B: darken(b, 0.2),
    L: darken(l, 0.12),
    A: darken(a, 0.22),
    X: darken(x, 0.2),
    k: '#2c2236',
    w: '#fbfbf4',
    p: '#f69ab0',
    r: '#e44a40',
    y: '#f8d838',
    o: '#f59a34',
    g: '#5cc24a',
    G: '#2f8a3c',
    n: '#8c5c34',
    N: '#6a4226',
    i: '#c8f0ff',
    s: '#b4b4c4',
    S: '#74748a',
    f1: '#fff6a8',
    f2: '#ffb42c',
    f3: '#f0521c',
    gold: '#f8c838',
    cl: '#f6f2e2',
    wa: '#5cb4f4',
  };
}

// ---------------------------------------------------------------- helpers

function starPts(cx: number, cy: number, R: number, r: number, n = 5, rot = UP): number[] {
  const pts: number[] = [];
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 === 0 ? R : r;
    const ang = rot + (i * Math.PI) / n;
    pts.push(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad);
  }
  return pts;
}

function rockPts(cx: number, cy: number, rx: number, ry: number, n: number, seed: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + 0.3;
    const j = 0.88 + 0.12 * Math.sin(seed * 12.9898 + i * 78.233);
    pts.push(cx + Math.cos(ang) * rx * j, cy + Math.sin(ang) * ry * j);
  }
  return pts;
}

function flame(a: Art, x: number, y: number, s: number) {
  const g = a.group();
  a.poly(
    [
      x - s * 0.55, y,
      x - s * 0.72, y - s * 0.55,
      x - s * 0.38, y - s * 0.95,
      x - s * 0.2, y - s * 1.7,
      x + s * 0.1, y - s * 1.05,
      x + s * 0.42, y - s * 1.45,
      x + s * 0.64, y - s * 0.6,
      x + s * 0.55, y,
    ],
    'f3',
    { g, flat: true },
  );
  a.ellipse(x, y - s * 0.3, s * 0.56, s * 0.42, 'f3', { g, flat: true });
  a.poly([x - s * 0.36, y - s * 0.12, x - s * 0.16, y - s * 1.05, x + s * 0.12, y - s * 0.62, x + s * 0.36, y - s * 0.12], 'f2', { g, deco: true });
  a.ellipse(x, y - s * 0.3, s * 0.24, s * 0.22, 'f1', { g, deco: true });
}

function leaf(a: Art, x: number, y: number, len: number, ang: number, col = 'g', g?: number) {
  const gg = g ?? a.group();
  const cx = x + Math.cos(ang) * len * 0.5;
  const cy = y + Math.sin(ang) * len * 0.5;
  a.ellipse(cx, cy, len * 0.5, len * 0.22, col, { g: gg, rot: ang });
  a.capsule(
    x + Math.cos(ang) * len * 0.15,
    y + Math.sin(ang) * len * 0.15,
    x + Math.cos(ang) * len * 0.82,
    y + Math.sin(ang) * len * 0.82,
    0.45,
    0.4,
    'G',
    { g: gg, deco: true },
  );
}

function flower(a: Art, x: number, y: number, r: number, petal = 'p', center = 'y') {
  const g = a.group();
  for (let i = 0; i < 5; i++) {
    const ang = UP + (i * Math.PI * 2) / 5;
    a.circle(x + Math.cos(ang) * r * 0.62, y + Math.sin(ang) * r * 0.62, r * 0.5, petal, { g });
  }
  a.circle(x, y, r * 0.38, center, { g, deco: true });
}

function bolt(a: Art, x: number, y: number, s: number, col: string, o: { deco?: boolean } = {}) {
  a.poly(
    [x - s * 0.1, y - s, x + s * 0.45, y - s, x + s * 0.12, y - s * 0.15, x + s * 0.5, y - s * 0.15, x - s * 0.25, y + s, x - s * 0.02, y + s * 0.12, x - s * 0.4, y + s * 0.12],
    col,
    o,
  );
}

// ------------------------------------------------------------ head parts

function earsBack(c: Ctx, hx: number, hy: number, r: number) {
  const { a } = c;
  const inner = has(c, 'ei-p') ? 'p' : 'l';
  const ec = has(c, 'ears-a') || has(c, 'darkface') ? 'a' : 'b';
  for (const s of SIDES) {
    if (has(c, 'e-pointy')) {
      const g = a.group();
      a.poly([hx + s * r * 0.1, hy - r * 0.78, hx + s * r * 0.88, hy - r * 0.4, hx + s * r * 0.84, hy - r * 1.42], ec, { g });
      a.poly([hx + s * r * 0.38, hy - r * 0.74, hx + s * r * 0.72, hy - r * 0.58, hx + s * r * 0.72, hy - r * 1.1], inner, { g, deco: true });
    }
    if (has(c, 'e-round')) {
      const g = a.group();
      a.circle(hx + s * r * 0.74, hy - r * 0.7, r * 0.42, ec, { g });
      a.circle(hx + s * r * 0.74, hy - r * 0.7, r * 0.21, inner, { g, deco: true });
    }
    if (has(c, 'e-long')) {
      const g = a.group();
      a.ellipse(hx + s * r * 0.42, hy - r * 1.4, r * 0.27, r * 0.82, ec, { g, rot: s * 0.16 });
      a.ellipse(hx + s * r * 0.4, hy - r * 1.32, r * 0.11, r * 0.56, inner, { g, deco: true, rot: s * 0.16 });
      if (has(c, 'tips')) a.ellipse(hx + s * r * 0.55, hy - r * 2.05, r * 0.24, r * 0.26, 'x', { g, deco: true });
    }
    if (has(c, 'e-tiny')) a.circle(hx + s * r * 0.62, hy - r * 0.76, r * 0.22, ec);
    if (has(c, 'e-bat')) {
      const g = a.group();
      a.poly([hx + s * r * 0.12, hy - r * 0.7, hx + s * r * 0.98, hy - r * 0.12, hx + s * r * 1.1, hy - r * 1.55], 'b', { g });
      a.poly([hx + s * r * 0.4, hy - r * 0.62, hx + s * r * 0.86, hy - r * 0.34, hx + s * r * 0.94, hy - r * 1.12], 'p', { g, deco: true });
    }
    if (has(c, 'e-gills')) {
      const g = a.group();
      for (let i = 0; i < 3; i++) {
        a.capsule(hx + s * r * 0.72, hy - r * 0.32 + i * r * 0.3, hx + s * r * 1.38, hy - r * 0.8 + i * r * 0.48, r * 0.16, r * 0.11, 'a', { g });
      }
    }
    if (has(c, 'e-fin')) {
      a.poly([hx + s * r * 0.72, hy - r * 0.4, hx + s * r * 1.5, hy - r * 0.85, hx + s * r * 1.32, hy + r * 0.1, hx + s * r * 0.8, hy + r * 0.25], 'a');
    }
    if (has(c, 'e-tuft')) {
      a.poly([hx + s * r * 0.25, hy - r * 0.84, hx + s * r * 0.88, hy - r * 0.55, hx + s * r * 0.92, hy - r * 1.38], 'b');
    }
  }
}

function earsFront(c: Ctx, hx: number, hy: number, r: number) {
  const { a } = c;
  if (has(c, 'e-floppy')) {
    const ec = has(c, 'ears-a') || has(c, 'darkface') ? 'a' : 'B';
    for (const s of SIDES) a.ellipse(hx + s * r * 0.92, hy - r * 0.08, r * 0.27, r * 0.58, ec, { rot: -s * 0.4 });
  }
}

function hornsBack(c: Ctx, hx: number, hy: number, r: number) {
  const { a } = c;
  for (const s of SIDES) {
    if (has(c, 'h-horns')) {
      a.poly([hx + s * r * 0.18, hy - r * 0.78, hx + s * r * 0.58, hy - r * 0.66, hx + s * r * 0.58, hy - r * 1.48], 'x');
    }
    if (has(c, 'h-antlers')) {
      const g = a.group();
      a.tube([hx + s * r * 0.32, hy - r * 0.78, r * 0.13, hx + s * r * 0.62, hy - r * 1.4, r * 0.11, hx + s * r * 0.5, hy - r * 2.05, r * 0.09], 'n', { g });
      a.capsule(hx + s * r * 0.6, hy - r * 1.3, hx + s * r * 1.12, hy - r * 1.7, r * 0.09, r * 0.08, 'n', { g });
      if (has(c, 'leaves')) {
        leaf(a, hx + s * r * 0.5, hy - r * 2.02, r * 0.6, UP + s * 0.7);
        leaf(a, hx + s * r * 1.1, hy - r * 1.68, r * 0.55, UP + s * 1.1);
      }
      if (has(c, 'flowers')) flower(a, hx + s * r * 0.86, hy - r * 1.52, r * 0.32, 'p', 'y');
    }
    if (has(c, 'h-curl')) {
      a.tube(
        [
          hx + s * r * 0.3, hy - r * 0.82, r * 0.2,
          hx + s * r * 0.95, hy - r * 1.0, r * 0.24,
          hx + s * r * 1.32, hy - r * 0.48, r * 0.22,
          hx + s * r * 1.12, hy + r * 0.05, r * 0.16,
          hx + s * r * 0.86, hy - r * 0.16, r * 0.1,
        ],
        'x',
      );
    }
    if (has(c, 'h-bolt')) bolt(a, hx + s * r * 0.55, hy - r * 1.15, r * 0.48, 'x');
  }
}

function hornsFront(c: Ctx, hx: number, hy: number, r: number) {
  const { a } = c;
  if (has(c, 'h-horn')) {
    a.poly([hx - r * 0.17, hy - r * 0.76, hx + r * 0.17, hy - r * 0.76, hx + r * 0.03, hy - r * 1.78], 'x');
  }
  if (has(c, 'h-gem')) {
    a.poly([hx, hy - r * 0.74, hx + r * 0.15, hy - r * 0.55, hx, hy - r * 0.36, hx - r * 0.15, hy - r * 0.55], 'x', { deco: true });
  }
  if (has(c, 'h-band')) {
    const g = a.group();
    a.rect(hx - r * 0.98, hy - r * 0.64, r * 1.96, r * 0.24, 'r', { g, deco: true });
    a.poly([hx + r * 0.85, hy - r * 0.6, hx + r * 1.45, hy - r * 0.85, hx + r * 1.3, hy - r * 0.42], 'r');
  }
}

function headTop(c: Ctx, hx: number, top: number, r: number) {
  const { a } = c;
  if (has(c, 'h-sprout')) {
    a.capsule(hx, top + r * 0.2, hx + r * 0.03, top - r * 0.32, r * 0.08, r * 0.07, 'G');
    const g = a.group();
    leaf(a, hx, top - r * 0.3, r * 0.66, UP - 0.95, 'g', g);
    leaf(a, hx, top - r * 0.3, r * 0.66, UP + 0.95, 'g', g);
  }
  if (has(c, 'h-leaf')) leaf(a, hx + r * 0.05, top + r * 0.15, r * 0.95, UP + 0.55);
  if (has(c, 'h-flame')) flame(a, hx, top + r * 0.3, r * 0.6);
  if (has(c, 'h-antenna')) {
    for (const s of SIDES) {
      const g = a.group();
      a.capsule(hx + s * r * 0.25, top + r * 0.2, hx + s * r * 0.55, top - r * 0.6, r * 0.065, r * 0.06, 'k', { g });
      a.circle(hx + s * r * 0.58, top - r * 0.68, r * 0.16, 'x', { g });
    }
  }
  if (has(c, 'h-antenna1')) {
    const g = a.group();
    a.capsule(hx, top + r * 0.2, hx + r * 0.1, top - r * 0.62, r * 0.065, r * 0.06, 'k', { g });
    a.poly(starPts(hx + r * 0.12, top - r * 0.78, r * 0.32, r * 0.14), 'gold');
  }
  if (has(c, 'h-crest')) {
    const g = a.group();
    for (const i of [-1, 0, 1]) {
      a.poly(
        [hx + i * r * 0.3 - r * 0.15, top + r * 0.25, hx + i * r * 0.3 + r * 0.15, top + r * 0.25, hx + i * r * 0.46, top - r * (0.68 - Math.abs(i) * 0.2)],
        'a',
        { g },
      );
    }
  }
  if (has(c, 'h-tuft')) {
    a.poly([hx - r * 0.3, top + r * 0.2, hx - r * 0.1, top - r * 0.42, hx + r * 0.04, top + r * 0.1, hx + r * 0.3, top - r * 0.32, hx + r * 0.3, top + r * 0.2], 'b');
  }
  if (has(c, 'h-crown')) {
    a.poly(
      [
        hx - r * 0.45, top + r * 0.15,
        hx - r * 0.5, top - r * 0.42,
        hx - r * 0.24, top - r * 0.14,
        hx, top - r * 0.52,
        hx + r * 0.24, top - r * 0.14,
        hx + r * 0.5, top - r * 0.42,
        hx + r * 0.45, top + r * 0.15,
      ],
      'gold',
    );
  }
  if (has(c, 'h-flower')) flower(a, hx + r * 0.42, top + r * 0.02, r * 0.42);
  if (has(c, 'h-star')) a.poly(starPts(hx, top - r * 0.2, r * 0.42, r * 0.19), 'gold');
  if (has(c, 'h-hat')) {
    const g = a.group();
    a.rect(hx - r * 0.75, top - r * 0.05, r * 1.5, r * 0.22, 'k', { g });
    a.rect(hx - r * 0.48, top - r * 0.75, r * 0.96, r * 0.75, 'k', { g });
    a.rect(hx - r * 0.48, top - r * 0.22, r * 0.96, r * 0.14, 'a', { g, deco: true });
  }
  if (has(c, 'h-ice')) {
    const g = a.group();
    for (const i of [-1, 0, 1]) {
      a.poly([hx + i * r * 0.36 - r * 0.14, top + r * 0.22, hx + i * r * 0.36 + r * 0.14, top + r * 0.22, hx + i * r * 0.4, top - r * (0.75 - Math.abs(i) * 0.25)], 'i', { g });
    }
  }
}

function face(c: Ctx, hx: number, hy: number, r: number, muzzle: number) {
  const { a } = c;
  const big = c.stage === 1 ? 1.12 : 1;
  const es = r * 0.23 * big * (c.P.eye ?? 1);
  const ey = hy - r * (c.P.eyeY ?? (muzzle > 0 ? 0.14 : 0.04));
  const sep = r * (c.P.sep ?? 0.4);
  if (has(c, 'mask')) a.ellipse(hx, ey, r * 0.82, r * 0.26, 'a', { deco: true });
  if (has(c, 'patches')) for (const s of SIDES) a.ellipse(hx + s * sep, ey + r * 0.04, r * 0.26, r * 0.22, 'a', { deco: true, rot: s * 0.5 });
  a.eye(hx - sep, ey, es, c.eye, -1);
  a.eye(hx + sep, ey, es, c.eye, -1);
  if (muzzle > 0 || has(c, 'nose')) a.ellipse(hx, hy + r * (muzzle > 0 ? 0.3 : 0.2), r * 0.13, r * 0.09, 'k', { deco: true });
  const my = hy + r * (muzzle > 0 ? 0.52 : 0.36);
  a.mouth(hx, my, r * 0.42, c.mouth);
  if (has(c, 'blush')) for (const s of SIDES) a.ellipse(hx + s * r * 0.64, hy + r * 0.27, r * 0.16, r * 0.1, 'p', { deco: true });
  if (has(c, 'whiskers')) {
    for (const s of SIDES) {
      for (const i of [0, 1]) {
        a.capsule(hx + s * r * 0.5, hy + r * (0.3 + i * 0.13), hx + s * r * 0.92, hy + r * (0.22 + i * 0.24), 0.35, 0.35, 'k', { deco: true });
      }
    }
  }
  if (has(c, 'fangs')) {
    for (const s of SIDES) a.poly([hx + s * r * 0.1, my + 0.5, hx + s * r * 0.3, my + 0.5, hx + s * r * 0.2, my + r * 0.25], 'w', { deco: true });
  }
}

/** A front-facing head (the "cute mascot" look used by most creatures). */
function headFront(c: Ctx, hx: number, hy: number, r: number, o: { muzzle?: number; wide?: number; col?: string } = {}) {
  const { a } = c;
  const col = o.col ?? 'b';
  if (has(c, 'mane')) {
    const g = a.group();
    const mc = has(c, 'mane-fire') ? 'f3' : 'a';
    const n = 10;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      a.circle(hx + Math.cos(ang) * r * 0.98, hy + Math.sin(ang) * r * 0.92, r * 0.44, mc, { g, flat: mc === 'f3' });
    }
    a.circle(hx, hy, r * 1.05, mc, { g, flat: mc === 'f3' });
    if (has(c, 'flowers')) {
      flower(a, hx - r * 1.1, hy - r * 0.6, r * 0.38);
      flower(a, hx + r * 1.15, hy - r * 0.2, r * 0.34, 'w', 'y');
    }
  }
  earsBack(c, hx, hy, r);
  hornsBack(c, hx, hy, r);
  const g = a.group();
  a.ellipse(hx, hy, r * (o.wide ?? 1), r * 0.94, col, { g });
  const m = o.muzzle ?? 0;
  if (m > 0) a.ellipse(hx, hy + r * 0.42, r * (0.3 + 0.28 * m), r * (0.25 + 0.1 * m), 'l', { g });
  if (has(c, 'beard')) a.poly([hx - r * 0.2, hy + r * 0.75, hx + r * 0.2, hy + r * 0.75, hx, hy + r * 1.35], 'l');
  earsFront(c, hx, hy, r);
  hornsFront(c, hx, hy, r);
  headTop(c, hx, hy - r * 0.92, r);
  face(c, hx, hy, r, m);
}

// ------------------------------------------------------------ body parts

function tail(c: Ctx, x: number, y: number, d = 1) {
  const { a } = c;
  const tc = has(c, 'tail-a') ? 'a' : 'b';
  if (has(c, 't-thin')) a.tube([x, y, 2.6, x + d * 9, y - 3, 2.3, x + d * 15, y - 12, 2, x + d * 13, y - 22, 1.8], tc);
  if (has(c, 't-fluffy')) {
    const g = a.group();
    a.ellipse(x + d * 11, y - 11, 8.5, 15, tc, { g, rot: d * 0.55 });
    a.ellipse(x + d * 16, y - 20, 5, 6.5, 'l', { g, rot: d * 0.55 });
  }
  if (has(c, 't-flame')) {
    a.tube([x, y, 2.8, x + d * 9, y - 2, 2.5, x + d * 14, y - 9, 2.2], 'b');
    flame(a, x + d * 15, y - 9, 8.5);
  }
  if (has(c, 't-leaf')) {
    a.tube([x, y, 2.2, x + d * 8, y - 4, 1.8, x + d * 11, y - 12, 1.4], 'b');
    leaf(a, x + d * 11, y - 12, 13, UP + d * 0.45);
  }
  if (has(c, 't-bolt')) {
    a.poly([x, y - 2, x + d * 9, y - 9, x + d * 6, y - 11, x + d * 16, y - 23, x + d * 20, y - 19, x + d * 13, y - 9, x + d * 16, y - 7, x + d * 4, y + 2], 'x');
  }
  if (has(c, 't-fin')) a.poly([x - d * 3, y - 3, x + d * 14, y - 13, x + d * 10, y, x + d * 14, y + 9, x - d * 3, y + 3], 'a');
  if (has(c, 't-short')) a.circle(x + d * 2, y - 2, 4.5, 'l');
  if (has(c, 't-lizard')) a.tube([x - d * 3, y, 6, x + d * 10, y + 4, 4.5, x + d * 19, y + 4, 3, x + d * 25, y - 2, 1.6], 'b');
  if (has(c, 't-curly')) {
    a.tube([x, y, 1.6, x + d * 6, y - 2, 1.6, x + d * 9, y - 7, 1.5, x + d * 6, y - 11, 1.4, x + d * 3, y - 8, 1.3], 'b');
  }
  if (has(c, 't-ring')) {
    const g = a.group();
    a.ellipse(x + d * 11, y - 10, 7, 15, 'b', { g, rot: d * 0.6 });
    for (let i = 0; i < 3; i++) {
      a.ellipse(x + d * (6 + i * 5), y - (3 + i * 7.5), 6.5, 1.8, 'a', { g, deco: true, rot: d * 0.6 - Math.PI / 2 + 0.2 });
    }
  }
  if (has(c, 't-kanga')) a.tube([x - d * 2, y - 2, 6, x + d * 12, y + 6, 4.5, x + d * 22, y + 12, 3], 'b');
  if (has(c, 't-spade')) {
    a.tube([x, y, 3, x + d * 10, y + 2, 2.4, x + d * 18, y - 4, 1.8], 'b');
    a.poly([x + d * 16, y - 4, x + d * 22, y - 12, x + d * 26, y - 3, x + d * 21, y], 'a');
  }
}

function bodyDecos(c: Ctx, bx: number, by: number, rx: number, ry: number) {
  const { a } = c;
  if (has(c, 'spots')) {
    const pts = [
      [-0.35, -0.35, 0.17],
      [0.25, -0.45, 0.13],
      [0.5, 0.05, 0.15],
      [-0.02, 0.05, 0.11],
    ];
    for (const [px, py, pr] of pts) a.ellipse(bx + px * rx, by + py * ry, rx * pr, rx * pr * 0.85, 'a', { deco: true });
  }
  if (has(c, 'stripes')) {
    for (const i of [-1, 0, 1]) a.ellipse(bx + i * rx * 0.36, by - ry * 0.45, rx * 0.07, ry * 0.45, 'A', { deco: true });
  }
  if (has(c, 'bands')) {
    for (let i = -2; i <= 2; i++) {
      a.capsule(bx + i * rx * 0.24, by - ry * 0.98, bx + i * rx * 0.24 + rx * 0.04, by + ry * 0.35, 0.7, 0.7, 'A', { deco: true });
    }
  }
  if (has(c, 'bolt')) bolt(a, bx + rx * 0.15, by - ry * 0.1, ry * 0.55, 'x', { deco: true });
}

function backSpikes(c: Ctx, bx: number, by: number, rx: number, ry: number, n: number, size: number, from: number, to: number) {
  const { a } = c;
  const g = a.group();
  for (let i = 0; i < n; i++) {
    const t = from + (to - from) * (i / Math.max(1, n - 1));
    const sx = bx + t * rx;
    const sy = by - ry * Math.sqrt(Math.max(0, 1 - t * t)) + 2;
    a.poly([sx - size * 0.48, sy + 1, sx + size * 0.48, sy + 1, sx + size * 0.2, sy - size], 'a', { g });
  }
}

function legQ(a: Art, x: number, by: number, w: number, col: string) {
  const g = a.group();
  a.capsule(x, by, x - 0.5, 100 - w * 0.5, w * 0.5, w * 0.48, col, { g });
  a.ellipse(x - 1.3, 100 - w * 0.42, w * 0.64, w * 0.42, col, { g });
}

function sideWing(c: Ctx, x: number, y: number, s: number, col = 'l') {
  const { a } = c;
  const g = a.group();
  a.poly(
    [x, y + s * 0.15, x + s * 0.15, y - s * 0.75, x + s * 0.9, y - s * 1.05, x + s * 0.82, y - s * 0.62, x + s * 1.05, y - s * 0.5, x + s * 0.8, y - s * 0.2, x + s * 0.95, y - s * 0.02, x + s * 0.45, y + s * 0.2],
    col,
    { g },
  );
}

// --------------------------------------------------------------- archetypes

const QUAD: Record<string, { len: number; h: number; leg: number; legW: number; head: number; snout: number; neck?: number; wide?: number }> = {
  dog: { len: 23, h: 13.5, leg: 13, legW: 5.5, head: 15, snout: 0.4 },
  wolf: { len: 27, h: 14, leg: 17, legW: 6, head: 14.5, snout: 0.55 },
  cat: { len: 22, h: 12.5, leg: 12, legW: 5, head: 15, snout: 0.12 },
  rodent: { len: 19, h: 15, leg: 6, legW: 6, head: 15.5, snout: 0.15 },
  deer: { len: 21, h: 12, leg: 20, legW: 4.2, head: 13, snout: 0.4, neck: 5 },
  horse: { len: 25, h: 13, leg: 21, legW: 5, head: 13.5, snout: 0.55, neck: 9 },
  bear: { len: 25, h: 17, leg: 11, legW: 8, head: 16, snout: 0.35 },
  lion: { len: 27, h: 15, leg: 16, legW: 7, head: 15, snout: 0.35 },
  lizard: { len: 25, h: 10.5, leg: 8, legW: 5, head: 13.5, snout: 0.45 },
  axolotl: { len: 23, h: 11.5, leg: 6, legW: 5, head: 16.5, snout: 0, wide: 1.15 },
  cow: { len: 28, h: 16, leg: 14, legW: 7, head: 14, snout: 0.6 },
  pig: { len: 24, h: 16, leg: 8, legW: 6, head: 15, snout: 0.5 },
  goat: { len: 22, h: 13.5, leg: 16, legW: 5, head: 14, snout: 0.45 },
  ram: { len: 27, h: 16, leg: 18, legW: 6.5, head: 15, snout: 0.45 },
  rhino: { len: 30, h: 18, leg: 11, legW: 9, head: 15.5, snout: 0.7 },
  armadillo: { len: 23, h: 15, leg: 6, legW: 5, head: 12.5, snout: 0.6 },
  sheep: { len: 24, h: 15, leg: 12, legW: 4, head: 12.5, snout: 0.3 },
  otter: { len: 26, h: 11, leg: 6, legW: 5, head: 14, snout: 0.35 },
  seal: { len: 26, h: 14, leg: 0, legW: 0, head: 15, snout: 0.3 },
};

function quad(c: Ctx): Res {
  const { a } = c;
  const v = c.s.v ?? 'dog';
  const p = { ...(QUAD[v] ?? QUAD.dog), ...c.P };
  const baby = [1.16, 1.06, 1][c.stage - 1] ?? 1;
  const { len, h, leg, legW } = p;
  const hr = p.head * baby;
  const neck = p.neck ?? 0;
  const bx = 5;
  const by = leg > 0 ? 100 - leg - h * 0.62 : 100 - h;
  const hx = bx - len * 0.8 - neck * 0.25;
  const hy = by - h * 0.5 - hr * 0.55 - neck;
  const dark = has(c, 'darkface');
  const limb = dark ? 'a' : 'B';

  if (has(c, 'wings')) {
    const g = a.group();
    a.poly([bx - 6, by - h * 0.6, bx - 12, by - h * 2.6, bx + 6, by - h * 3.0, bx + 20, by - h * 2.2, bx + 14, by - h * 1.6, bx + 22, by - h * 1.2, bx + 10, by - h * 0.5], 'l', { g });
  }
  tail(c, bx + len * 0.9, by - h * 0.2, 1);
  if (leg > 0) {
    legQ(a, bx - len * 0.42 + 4, by, legW, limb);
    legQ(a, bx + len * 0.6 + 3, by, legW, limb);
  }
  if (has(c, 'spikes')) backSpikes(c, bx, by, len, h, 5, 7 + c.stage * 1.6, -0.55, 0.65);

  const gb = a.group();
  if (has(c, 'wool')) {
    const puffs = [
      [-0.72, -0.15, 0.4], [-0.42, -0.6, 0.42], [0.05, -0.75, 0.44], [0.5, -0.6, 0.42], [0.8, -0.15, 0.4],
      [0.68, 0.35, 0.38], [0.2, 0.5, 0.42], [-0.3, 0.5, 0.42], [-0.72, 0.3, 0.38], [0, -0.05, 0.8],
    ];
    for (const [px, py, pr] of puffs) a.circle(bx + px * len, by + py * h, pr * len * 0.62, 'b', { g: gb });
  } else {
    a.ellipse(bx, by, len, h, 'b', { g: gb });
    if (!has(c, 'nobelly')) a.ellipse(bx - len * 0.12, by + h * 0.42, len * 0.62, h * 0.5, 'l', { g: gb });
  }
  bodyDecos(c, bx, by, len, h);
  if (has(c, 'scarf')) {
    const g = a.group();
    a.ellipse(bx - len * 0.62, by - h * 0.55, h * 0.55, h * 0.75, 'a', { g, rot: 0.6 });
    a.poly([bx - len * 0.45, by - h * 0.3, bx - len * 0.2, by + h * 0.45, bx - len * 0.36, by + h * 0.55], 'a', { g });
  }
  if (leg > 0) {
    legQ(a, bx - len * 0.55, by + 1, legW, dark ? 'a' : 'b');
    legQ(a, bx + len * 0.5, by + 1, legW, dark ? 'a' : 'b');
  } else {
    a.ellipse(bx - len * 0.5, 97, 8, 3.2, 'B', { rot: 0.25 });
    a.ellipse(bx + len * 1.02, 95, 8, 3.4, 'B', { rot: -0.45 });
  }
  if (neck > 0) a.capsule(bx - len * 0.6, by - h * 0.3, hx + 2, hy + hr * 0.5, h * 0.42, hr * 0.5, 'b');
  if (v === 'pig') {
    headFront(c, hx, hy, hr, { muzzle: 0, col: dark ? 'a' : 'b' });
    const g = a.group();
    a.ellipse(hx, hy + hr * 0.4, hr * 0.36, hr * 0.26, 'a', { g });
    a.ellipse(hx - hr * 0.12, hy + hr * 0.4, hr * 0.06, hr * 0.1, 'A', { g, deco: true });
    a.ellipse(hx + hr * 0.12, hy + hr * 0.4, hr * 0.06, hr * 0.1, 'A', { g, deco: true });
    return;
  }
  headFront(c, hx, hy, hr, { muzzle: p.snout, wide: p.wide, col: dark ? 'a' : 'b' });
  if (v === 'rhino') a.poly([hx - hr * 0.22, hy + hr * 0.2, hx + hr * 0.22, hy + hr * 0.2, hx + hr * 0.02, hy - hr * 0.55], 'x');
}

const BIPED: Record<string, Partial<Record<string, number>>> = {
  base: { bw: 15, bh: 16, leg: 8, legW: 5, head: 14, arms: 0, armW: 3.6, snout: 0 },
  boxer: { bw: 14, bh: 16, leg: 10, head: 13, arms: 2, armW: 3.8 },
  monkey: { bw: 13, bh: 15, leg: 9, head: 14, arms: 1, armW: 3.2, snout: 0.3 },
  yeti: { bw: 19, bh: 20, leg: 9, legW: 6.5, head: 12, arms: 0, armW: 5.5, snout: 0.2 },
  mole: { bw: 16, bh: 15, leg: 4, legW: 6, head: 12, arms: 0, armW: 4, snout: 0.25 },
  kangaroo: { bw: 14, bh: 18, leg: 10, legW: 6, head: 12.5, arms: 2, armW: 3, snout: 0.45 },
  bear: { bw: 19, bh: 20, leg: 9, legW: 7, head: 14, arms: 0, armW: 5.5, snout: 0.35 },
  frog: { bw: 17, bh: 14, leg: 8, legW: 6, head: 15, arms: 2, armW: 3.6, sep: 0.55 },
  sloth: { bw: 15, bh: 17, leg: 7, legW: 5, head: 14, arms: 1, armW: 3.4, snout: 0.25 },
  koala: { bw: 15, bh: 15, leg: 6, legW: 5.5, head: 15.5, arms: 0, armW: 4 },
  panda: { bw: 17, bh: 17, leg: 8, legW: 6.5, head: 15, arms: 2, armW: 4.5 },
  bunny: { bw: 13, bh: 15, leg: 11, legW: 5, head: 13, arms: 1, armW: 3 },
  hamster: { bw: 19, bh: 18, leg: 5, legW: 6, head: 14, arms: 0, armW: 3.5 },
  golem: { bw: 20, bh: 19, leg: 10, legW: 7, head: 11, arms: 0, armW: 6 },
};

function biped(c: Ctx): Res {
  const { a } = c;
  const v = c.s.v ?? 'base';
  const p = { ...BIPED.base, ...(BIPED[v] ?? {}), ...c.P } as Record<string, number>;
  const baby = [1.12, 1.04, 1][c.stage - 1] ?? 1;
  const hr = p.head * baby;
  const by = 100 - p.leg - p.bh * 0.78;
  const hy = by - p.bh * 0.82 - hr * 0.62;
  if (v === 'frog') c.P = { ...c.P, sep: p.sep, eyeY: 0.62 };

  tail(c, p.bw * 0.75, by + p.bh * 0.35, 1);
  if (has(c, 'wings')) {
    for (const s of SIDES) {
      a.poly([s * p.bw * 0.4, by - p.bh * 0.5, s * (p.bw + 16), by - p.bh * 1.6, s * (p.bw + 12), by - p.bh * 0.6, s * (p.bw + 4), by], 'l');
    }
  }
  if (has(c, 'shell')) a.ellipse(0, by - 2, p.bw * 1.18, p.bh * 1.05, 'a');
  const lc = has(c, 'limbs-a') ? 'a' : 'b';
  for (const s of SIDES) {
    const g = a.group();
    const lx = s * p.bw * 0.5;
    a.capsule(lx, by + p.bh * 0.4, lx + s * 0.5, 100 - p.legW * 0.5, p.legW * 0.56, p.legW * 0.5, lc, { g });
    a.ellipse(lx + s * 1.3, 100 - p.legW * 0.42, p.legW * 0.8, p.legW * 0.46, lc, { g });
  }
  const gb = a.group();
  a.ellipse(0, by, p.bw, p.bh, 'b', { g: gb });
  if (!has(c, 'nobelly')) a.ellipse(0, by + p.bh * 0.2, p.bw * 0.66, p.bh * 0.66, 'l', { g: gb });
  if (has(c, 'pouch')) a.ellipse(0, by + p.bh * 0.42, p.bw * 0.42, p.bh * 0.22, 'L', { deco: true });
  if (has(c, 'belt')) {
    a.rect(-p.bw, by + p.bh * 0.05, p.bw * 2, p.bh * 0.2, 'x', { deco: true });
    a.rect(-p.bw * 0.2, by + p.bh * 0.02, p.bw * 0.4, p.bh * 0.26, 'gold', { deco: true });
  }
  bodyDecos(c, 0, by, p.bw, p.bh);

  for (const s of SIDES) {
    const sx = s * p.bw * 0.8;
    const sy = by - p.bh * 0.42;
    let hx: number;
    let hy2: number;
    const g = a.group();
    if (p.arms === 1) {
      hx = s * (p.bw + 7);
      hy2 = by - p.bh * 1.15;
      a.capsule(sx, sy, hx, hy2, p.armW, p.armW * 0.9, lc, { g });
    } else if (p.arms === 2) {
      hx = s * p.bw * 0.5;
      hy2 = by - p.bh * 0.5;
      a.tube([sx, sy, p.armW, s * (p.bw + 5), by - p.bh * 0.02, p.armW * 0.95, hx, hy2, p.armW * 0.9], lc, { g });
    } else {
      hx = s * (p.bw + 4);
      hy2 = by + p.bh * 0.3;
      a.capsule(sx, sy, hx, hy2, p.armW, p.armW * 0.9, lc, { g });
    }
    if (has(c, 'fists')) a.circle(hx, hy2, p.armW * 1.75, 'a');
    else a.circle(hx, hy2, p.armW * 1.12, lc, { g });
    if (has(c, 'claws')) {
      for (const i of [-1, 0, 1]) {
        const cx = hx + i * p.armW * 0.6;
        a.poly([cx - 0.9, hy2 + p.armW * 0.6, cx + 0.9, hy2 + p.armW * 0.6, cx, hy2 + p.armW * 1.6], 'cl');
      }
    }
  }
  if (v === 'frog') {
    // Bulging frog eyes on top of the head.
    const g = a.group();
    for (const s of SIDES) a.circle(s * hr * 0.55, hy - hr * 0.62, hr * 0.42, 'b', { g });
  }
  headFront(c, 0, hy, hr, { muzzle: p.snout, wide: v === 'frog' ? 1.2 : 1 });
}

function blob(c: Ctx): Res {
  const { a, P } = c;
  const v = c.s.v ?? 'round';
  switch (v) {
    case 'drop': {
      const r = P.r ?? 21;
      const cy = 100 - r;
      const g = a.group();
      a.circle(0, cy, r, 'b', { g });
      a.poly([-r * 0.72, cy - r * 0.6, 0, cy - r * 2.2, r * 0.72, cy - r * 0.6], 'b', { g });
      a.ellipse(-r * 0.45, cy - r * 0.55, r * 0.16, r * 0.3, 'w', { deco: true, rot: 0.4 });
      face(c, 0, cy + r * 0.05, r * 0.85, 0);
      return;
    }
    case 'cocoon': {
      const g = a.group();
      a.ellipse(0, 60, 16, 39, 'b', { g, rot: 0.12 });
      for (const y of [44, 60, 76]) a.capsule(-15, y - 2, 15, y + 2, 1, 1, 'A', { deco: true });
      a.capsule(-2, 22, 0, 6, 0.8, 0.8, 'l');
      face(c, -1.5, 40, 12, 0);
      return;
    }
    case 'cube': {
      a.rrect(-21, 52, 42, 46, 7, 'b');
      a.rect(-16, 56, 9, 4, 'w', { deco: true });
      a.rect(-16, 60, 4, 7, 'w', { deco: true });
      headTop(c, 0, 53, 20);
      face(c, 0, 76, 17, 0);
      return;
    }
    case 'cloud':
    case 'rainbow': {
      if (v === 'rainbow') {
        const cols = ['#f05050', '#f8a030', '#f8e040', '#58c858', '#58a8f0', '#a070e0'];
        const gr = a.group();
        for (let i = 0; i < cols.length; i++) {
          const r = 30 - i * 3.2;
          a.ellipse(0, 56, r, r, cols[i], { g: gr, flat: true });
        }
        a.ellipse(0, 56, 10.5, 10.5, null);
        a.rect(-34, 56, 68, 30, null);
      }
      const g = a.group();
      const puffs = [
        [-20, 62, 12], [-6, 52, 16], [12, 54, 15], [24, 64, 11], [0, 68, 14], [-14, 70, 11], [14, 70, 11],
      ];
      for (const [x, y, r] of puffs) a.circle(x, y, r, 'b', { g });
      if (has(c, 'bolt')) bolt(a, 4, 88, 9, 'y');
      face(c, 0, 62, 15, 0);
      return { float: true };
    }
    case 'star': {
      const g = a.group();
      a.poly(starPts(0, 54, 34, 16), 'b', { g });
      a.circle(0, 54, 16, 'b', { g });
      a.poly(starPts(0, 54, 20, 9), 'l', { g });
      if (has(c, 'dots')) for (const [x, y] of [[-20, 46], [20, 46], [0, 30], [-12, 72], [12, 72]]) a.circle(x, y, 1.6, 'a', { deco: true });
      face(c, 0, 55, 13, 0);
      return { float: has(c, 'float') };
    }
    case 'bulb': {
      const g = a.group();
      a.rrect(-10, 66, 20, 18, 3, 's', { g });
      for (const y of [70, 75, 80]) a.capsule(-10, y, 10, y, 0.6, 0.6, 'S', { g, deco: true });
      for (const s of SIDES) a.ellipse(s * 7, 92, 6, 4, 's');
      a.circle(0, 46, 22, 'b');
      a.ellipse(-11, 37, 3, 6, 'w', { deco: true, rot: 0.5 });
      if (has(c, 'arms')) for (const s of SIDES) a.capsule(s * 9, 72, s * 22, 66, 2.4, 2.2, 's');
      face(c, 0, 48, 17, 0);
      return;
    }
    case 'battery': {
      a.rrect(-6, 32, 12, 9, 2, 's');
      for (const s of SIDES) a.capsule(s * 9, 64, s * 21, 70, 2.6, 2.4, 'a');
      for (const s of SIDES) a.ellipse(s * 7, 97, 6, 3.5, 'a');
      const g = a.group();
      a.rrect(-15, 39, 30, 57, 6, 'b', { g });
      a.rect(-15, 70, 30, 22, 'l', { g, deco: true });
      a.rect(-5, 79, 10, 3, 'y', { deco: true });
      a.rect(-1.5, 75.5, 3, 10, 'y', { deco: true });
      face(c, 0, 54, 13, 0);
      return;
    }
    case 'bubble': {
      a.circle(0, 50, 26, 'b');
      a.ellipse(-12, 38, 6, 3.5, 'w', { deco: true, rot: -0.7 });
      a.circle(13, 63, 2.5, 'w', { deco: true });
      a.circle(-26, 22, 4, 'b');
      a.circle(27, 26, 3, 'b');
      face(c, 0, 52, 17, 0);
      return { float: true };
    }
    case 'snowman': {
      const g = a.group();
      if (has(c, 'arms')) for (const s of SIDES) a.tube([s * 14, 70, 1.6, s * 26, 60, 1.4, s * 30, 52, 1.2], 'n');
      a.circle(0, 78, 20, 'b', { g });
      a.circle(0, 49, 15, 'b', { g });
      for (const y of [72, 82]) a.circle(0, y, 1.8, 'k', { deco: true });
      const gs = a.group();
      a.ellipse(0, 62, 14, 4, 'a', { g: gs });
      a.poly([4, 62, 12, 62, 12, 76, 6, 74], 'a', { g: gs });
      headTop(c, 0, 35, 15);
      face(c, 0, 49, 14, 0);
      a.poly([-1, 51, -11, 54, -1, 55], 'o');
      return;
    }
    case 'lava': {
      const g = a.group();
      a.ellipse(0, 74, 26, 22, 'b', { g });
      for (const [x, r] of [[-18, 6], [-5, 7], [9, 6], [20, 5]]) a.circle(x, 94, r, 'b', { g });
      for (const [x, y, r] of [[-12, 66, 3.5], [14, 74, 2.5], [6, 88, 3], [-16, 84, 2]]) a.circle(x, y, r, 'l', { deco: true });
      if (has(c, 'crystals')) {
        const gr = a.group();
        for (const [x, y] of [[-18, 58], [16, 56], [0, 50]]) a.poly(rockPts(x, y, 7, 6, 6, x + y), 'a', { g: gr });
      }
      headTop(c, 0, 52, 20);
      face(c, 0, 70, 18, 0);
      return;
    }
    case 'frog': {
      for (const s of SIDES) a.ellipse(s * 24, 93, 10, 5.5, 'B', { rot: s * 0.2 });
      const g = a.group();
      a.ellipse(0, 81, 25, 17, 'b', { g });
      for (const s of SIDES) a.circle(s * 12, 63, 8.5, 'b', { g });
      a.ellipse(0, 89, 16, 8, 'l', { g });
      for (const s of SIDES) a.eye(s * 12, 63, 4.6, 'big', -1);
      a.mouth(0, 79, 16, c.mouth);
      if (has(c, 'blush')) for (const s of SIDES) a.ellipse(s * 17, 76, 3.6, 2.2, 'p', { deco: true });
      return;
    }
    default: {
      const w = P.w ?? 25;
      const h = P.h ?? 22;
      const cy = 100 - h;
      if (!has(c, 'nofeet')) for (const s of SIDES) a.ellipse(s * w * 0.45, 97.5, w * 0.24, 3.4, 'B');
      tail(c, w * 0.8, cy + h * 0.3, 1);
      earsBack(c, 0, cy, Math.min(w, h * 1.2));
      hornsBack(c, 0, cy, Math.min(w, h * 1.2));
      if (has(c, 'arms')) for (const s of SIDES) a.ellipse(s * w * 0.98, cy + h * 0.25, 5, 3.8, 'b', { rot: s * 0.5 });
      const g = a.group();
      a.ellipse(0, cy, w, h, 'b', { g });
      if (!has(c, 'nobelly')) a.ellipse(0, cy + h * 0.42, w * 0.62, h * 0.48, 'l', { g });
      bodyDecos(c, 0, cy, w, h);
      hornsFront(c, 0, cy, Math.min(w, h * 1.2));
      headTop(c, 0, cy - h, Math.min(w, h * 1.2));
      face(c, 0, cy - h * 0.12, Math.min(w, h) * 0.95, 0);
      return { float: has(c, 'float') };
    }
  }
}

function bird(c: Ctx): Res {
  const { a, P } = c;
  const v = c.s.v ?? 'perch';
  const baby = [1.15, 1.05, 1][c.stage - 1] ?? 1;

  if (v === 'owl') {
    const cy = 74;
    for (const s of SIDES) a.ellipse(s * 7, 98, 5, 2.4, 'o');
    for (const s of SIDES) a.ellipse(s * 20, cy + 4, 7, 16, 'B', { rot: s * 0.2 });
    earsBack(c, 0, cy - 8, 22);
    const g = a.group();
    a.ellipse(0, cy, 21, 24, 'b', { g });
    a.ellipse(0, cy + 9, 13, 13, 'l', { g });
    for (const s of SIDES) a.circle(s * 8.5, cy - 9, 8.2, 'l', { g });
    for (const [x, y] of [[-5, 78], [5, 78], [0, 85]]) a.poly([x - 2.5, y, x, y + 2.5, x + 2.5, y], 'L', { deco: true });
    for (const s of SIDES) a.eye(s * 8.5, cy - 9, 5.2, 'big', 0);
    a.poly([-2.4, cy - 4, 2.4, cy - 4, 0, cy + 1.5], 'o');
    headTop(c, 0, cy - 24, 18);
    return;
  }
  if (v === 'penguin') {
    for (const s of SIDES) a.ellipse(s * 7, 98, 6.5, 2.6, 'o');
    for (const s of SIDES) a.ellipse(s * 18, 70, 4.5, 13, 'b', { rot: s * 0.35 });
    const g = a.group();
    a.ellipse(0, 70, 17, 27, 'b', { g });
    a.ellipse(0, 76, 11, 20, 'w', { g });
    a.ellipse(0, 48, 11, 9, 'w', { g });
    if (has(c, 'neckpatch')) for (const s of SIDES) a.ellipse(s * 10, 56, 4, 6, 'y', { deco: true, rot: s * 0.3 });
    a.eye(-5, 46, 3.2, c.eye, 0);
    a.eye(5, 46, 3.2, c.eye, 0);
    a.poly([-3.4, 51, 3.4, 51, 0, 55.5], 'o');
    if (has(c, 'blush')) for (const s of SIDES) a.ellipse(s * 8.5, 51, 2.4, 1.4, 'p', { deco: true });
    headTop(c, 0, 43, 15);
    return;
  }
  if (v === 'chick') {
    for (const s of SIDES) a.ellipse(s * 7, 98, 5, 2.4, 'o');
    for (const s of SIDES) a.ellipse(s * 20, 78, 5, 8, 'b', { rot: s * 0.6 });
    const g = a.group();
    a.ellipse(0, 76, 20, 20, 'b', { g });
    a.ellipse(0, 84, 12, 10, 'l', { g });
    a.eye(-7, 70, 3.4, c.eye, 0);
    a.eye(7, 70, 3.4, c.eye, 0);
    a.poly([-3, 75, 3, 75, 0, 79], 'o');
    if (has(c, 'blush')) for (const s of SIDES) a.ellipse(s * 12, 76, 2.6, 1.6, 'p', { deco: true });
    headTop(c, 0, 57, 15);
    return;
  }

  const fly = v === 'fly' || v === 'phoenix';
  const br = P.body ?? 18;
  const bx = 6;
  const by = fly ? 54 : 100 - 16 - br * 0.8;
  const hr = (P.head ?? 12.5) * baby;
  const hx = bx - br * 0.92;
  const hy = by - br * 0.82;

  if (v === 'phoenix') {
    a.tube([bx + br * 0.6, by + 2, 4, bx + br + 10, by + 16, 3.2, bx + br + 16, by + 34, 2.4, bx + br + 8, by + 42, 1.6], 'a');
    a.tube([bx + br * 0.5, by + 4, 3.4, bx + br + 2, by + 22, 2.6, bx + br - 2, by + 40, 1.8], 'x');
  } else {
    const tx = bx + br * 0.72;
    a.poly([tx, by - 3, tx + 18, by - 13, tx + 20, by - 5, tx + 17, by + 4, tx, by + 6], 'a');
  }
  if (fly) {
    a.poly(
      [bx - 4, by - br * 0.3, bx - 10, by - br * 1.2, bx - 8, by - br * 1.85, bx - 16, by - br * 2.05, bx - 2, by - br * 1.55, bx + 2, by - br * 1.0, bx + 8, by - br * 0.4],
      'A',
    );
  }
  if (!fly) {
    for (const lx of [bx - 4, bx + 5]) {
      const g = a.group();
      a.capsule(lx, by + br * 0.5, lx, 98.5, 1.5, 1.4, 'o', { g });
      a.capsule(lx - 4.5, 98.6, lx + 2, 98.6, 1.3, 1.3, 'o', { g });
    }
  }
  const g = a.group();
  a.ellipse(bx, by, br * 1.08, br * 0.86, 'b', { g, rot: -0.22 });
  a.circle(hx, hy, hr, 'b', { g });
  a.ellipse(bx - br * 0.28, by + br * 0.3, br * 0.62, br * 0.5, 'l', { g, rot: -0.2 });
  if (has(c, 'h-crest')) {
    const gc = a.group();
    for (const i of [0, 1, 2]) {
      a.poly([hx + i * 3 - 2, hy - hr * 0.72, hx + i * 3 + 3, hy - hr * 0.78, hx + i * 6 + 6, hy - hr * 1.65 + i * 3], i === 1 ? 'x' : 'a', { g: gc });
    }
  }
  if (has(c, 'h-crown')) headTop(c, hx, hy - hr * 0.92, hr);
  if (v === 'duck') {
    a.ellipse(hx - hr * 1.02, hy + hr * 0.32, hr * 0.62, hr * 0.28, 'o');
  } else if (v === 'eagle') {
    a.poly([hx - hr * 0.7, hy - hr * 0.22, hx - hr * 1.55, hy + hr * 0.02, hx - hr * 1.48, hy + hr * 0.52, hx - hr * 1.22, hy + hr * 0.3, hx - hr * 0.7, hy + hr * 0.45], 'y');
  } else {
    a.poly([hx - hr * 0.72, hy - hr * 0.12, hx - hr * (v === 'fly' && has(c, 'longbeak') ? 2.3 : 1.62), hy + hr * 0.2, hx - hr * 0.72, hy + hr * 0.5], 'o');
  }
  a.eye(hx - hr * 0.22, hy - hr * 0.14, hr * 0.3, c.eye, -1);
  if (has(c, 'blush')) a.ellipse(hx - hr * 0.08, hy + hr * 0.4, hr * 0.2, hr * 0.12, 'p', { deco: true });
  if (fly) {
    const gw = a.group();
    a.poly(
      [
        bx - 2, by - br * 0.3,
        bx - 3, by - br * 1.2,
        bx + 3, by - br * 1.9,
        bx + 12, by - br * 2.25,
        bx + 27, by - br * 2.05,
        bx + 20, by - br * 1.62,
        bx + 27, by - br * 1.38,
        bx + 19, by - br * 1.02,
        bx + 24, by - br * 0.72,
        bx + 14, by - br * 0.48,
        bx + 15, by - br * 0.16,
        bx + 6, by - br * 0.1,
      ],
      'a',
      { g: gw },
    );
    for (const i of [0, 1, 2]) {
      a.capsule(bx + 3 + i * 4, by - br * 0.5, bx + 9 + i * 5, by - br * (1.85 - i * 0.3), 0.5, 0.5, 'A', { g: gw, deco: true });
    }
  } else {
    const gw = a.group();
    a.ellipse(bx + 5, by - 1, br * 0.72, br * 0.48, 'a', { g: gw, rot: 0.38 });
    a.poly([bx + 10, by + 4, bx + 23, by + 10, bx + 14, by + 1], 'a', { g: gw });
  }
  return { float: fly };
}

function fish(c: Ctx): Res {
  const { a, P } = c;
  const v = c.s.v ?? 'fish';
  if (v === 'whale') {
    a.poly([28, 50, 42, 30, 48, 34, 40, 52, 46, 60], 'b');
    const g = a.group();
    a.ellipse(0, 54, 38, 22, 'b', { g });
    a.ellipse(-6, 66, 28, 10, 'l', { g });
    for (const i of [0, 1, 2]) a.capsule(-26 + i * 4, 64 + i * 2, 12 + i * 2, 66 + i * 3, 0.5, 0.5, 'L', { deco: true });
    a.ellipse(-2, 66, 8, 4, 'B', { rot: 0.5 });
    for (const [x, y, r] of [[-18, 26, 3], [-24, 20, 2.4], [-12, 20, 2.4], [-18, 14, 2]]) a.circle(x, y, r, 'wa');
    a.eye(-24, 50, 3, c.eye, -1);
    a.mouth(-30, 60, 10, c.mouth);
    if (has(c, 'blush')) a.ellipse(-22, 58, 3, 1.8, 'p', { deco: true });
    return { float: true };
  }
  if (v === 'dolphin') {
    a.poly([24, 46, 40, 34, 36, 48, 42, 60, 26, 52], 'b');
    a.poly([-2, 40, 8, 26, 14, 40], 'b');
    const g = a.group();
    a.ellipse(2, 50, 30, 12, 'b', { g, rot: -0.1 });
    a.capsule(-26, 54, -40, 56, 4.2, 3, 'b', { g });
    a.ellipse(-4, 56, 22, 6, 'l', { g, rot: -0.1 });
    a.ellipse(0, 58, 7, 3.4, 'B', { rot: 0.6 });
    a.eye(-20, 48, 3.2, c.eye, -1);
    a.mouth(-30, 56, 8, 'smile');
    return { float: true };
  }
  if (v === 'shark') {
    a.poly([24, 50, 44, 30, 40, 50, 44, 64, 26, 56], 'b');
    a.poly([-4, 42, 8, 18, 16, 42], 'b');
    const g = a.group();
    a.ellipse(0, 52, 31, 14, 'b', { g });
    a.ellipse(-6, 59, 22, 6, 'l', { g });
    a.ellipse(2, 60, 8, 3.6, 'B', { rot: 0.6 });
    a.eye(-18, 48, 3.4, c.eye, -1);
    a.mouth(-20, 56, 12, 'grin');
    return { float: true };
  }
  if (v === 'puffer') {
    const gs = a.group();
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const x = Math.cos(ang);
      const y = Math.sin(ang);
      a.poly([x * 20 - y * 4, 50 + y * 20 + x * 4, x * 31, 50 + y * 31, x * 20 + y * 4, 50 + y * 20 - x * 4], 'a', { g: gs });
    }
    a.poly([20, 50, 34, 42, 34, 58], 'a');
    const g = a.group();
    a.circle(0, 50, 23, 'b', { g });
    a.ellipse(0, 60, 16, 10, 'l', { g });
    a.eye(-9, 45, 4.6, 'big', -1);
    a.eye(7, 45, 4.6, 'big', -1);
    a.mouth(-1, 58, 5, 'o');
    return { float: true };
  }
  if (v === 'shrimp') {
    a.tube([-18, 38, 0.7, -30, 18, 0.6, -36, 10, 0.5], 'a');
    a.tube([-16, 36, 0.7, -22, 14, 0.6, -18, 6, 0.5], 'a');
    a.poly([16, 68, 30, 72, 26, 80, 14, 76], 'a');
    const pts = [
      [-16, 42, 11], [-2, 46, 10], [9, 54, 9], [14, 63, 7.5], [12, 71, 6],
    ];
    for (const [x, y] of pts.slice(0, 4)) a.capsule(x - 2, y + 6, x - 4, y + 13, 0.8, 0.6, 'a');
    for (let i = pts.length - 1; i >= 0; i--) {
      const [x, y, r] = pts[i];
      a.circle(x, y, r, 'b');
    }
    a.eye(-19, 40, 3.8, 'big', -1);
    a.mouth(-20, 47, 4, 'smile');
    return { float: true };
  }
  const L = P.len ?? 26;
  const H = P.h ?? 17;
  a.poly([L * 0.8, 50, L + 16, 50 - H * 0.95, L + 11, 50, L + 16, 50 + H * 0.95], 'a');
  if (has(c, 'h-crest')) a.poly([-L * 0.5, 50 - H * 0.75, -L * 0.1, 50 - H * 2.0, L * 0.5, 50 - H * 1.6, L * 0.62, 50 - H * 0.6], 'a');
  else a.poly([-L * 0.3, 50 - H * 0.8, L * 0.1, 50 - H * 1.6, L * 0.45, 50 - H * 0.75], 'a');
  const g = a.group();
  a.ellipse(0, 50, L, H, 'b', { g });
  a.ellipse(-2, 50 + H * 0.45, L * 0.75, H * 0.48, 'l', { g });
  if (has(c, 'stripes')) for (const x of [L * 0.05, L * 0.4]) a.ellipse(x, 48, L * 0.08, H * 0.82, 'a', { deco: true });
  a.ellipse(2, 55, 7, 3.8, 'a', { rot: 0.55 });
  a.eye(-L * 0.55, 46, H * 0.28, 'big', -1);
  a.mouth(-L * 0.84, 53, 4, c.mouth);
  return { float: true };
}

function serpent(c: Ctx): Res {
  const { a, P } = c;
  const v = c.s.v ?? 'snake';
  const T = P.thick ?? 8;
  const oy = -(T - 1); // lift thick bodies so the coil stays inside the picture
  const Y = (pts: number[]) => pts.map((v, i) => (i % 3 === 1 ? v + oy : v));
  if (v === 'sky') {
    for (const [x, y, r] of [[-24, 94, 7], [-12, 96, 8], [2, 95, 7], [16, 96, 8], [28, 94, 6]]) a.circle(x, y + oy + 2, r, 'w');
  }
  const g1 = a.group();
  a.tube(Y([30, 92, T * 0.45, 18, 96, T * 0.8, 0, 97, T * 0.95, -20, 94, T, -30, 85, T, -24, 76, T, -6, 73, T, 14, 74, T]), 'b', { g: g1 });
  if (has(c, 'fins')) a.poly([-8, 66 + oy, 2, 58 + oy, 12, 66 + oy], 'a');
  const g2 = a.group();
  const rise = Y([14, 74, T, 24, 66, T * 0.95, 20, 54, T * 0.9, 6, 47, T * 0.85, -6, 40, T * 0.8, -12, 30, T * 0.75]);
  if (has(c, 'spikes')) {
    const gs = a.group();
    for (const [x, y0] of [[30, 64], [28, 50], [16, 40], [4, 32]]) {
      const y = y0 + oy;
      a.poly([x - 4, y + 3, x + 3, y - 3, x + 6, y + 6], 'a', { g: gs });
    }
  }
  a.tube(rise, 'b', { g: g2 });
  a.tube(Y([10, 75, T * 0.45, 18, 66, T * 0.42, 14, 55, T * 0.4, 2, 48, T * 0.36]), 'l', { g: g2 });
  const hr = (P.head ?? 12) * ([1.12, 1.04, 1][c.stage - 1] ?? 1);
  const hx = -15;
  const hy = 24 + oy * 0.4;
  earsBack(c, hx, hy, hr);
  hornsBack(c, hx, hy, hr);
  const gh = a.group();
  a.ellipse(hx, hy, hr * 1.12, hr * 0.92, 'b', { g: gh });
  if (has(c, 'whiskers-long')) {
    for (const s of SIDES) a.tube([hx + s * hr * 0.6, hy + hr * 0.4, 0.9, hx + s * hr * 1.6, hy + hr * 0.8, 0.8, hx + s * hr * 2.0, hy + hr * 0.3, 0.6], 'x');
  }
  headTop(c, hx, hy - hr * 0.88, hr);
  face(c, hx, hy, hr, 0);
  return;
}

function bug(c: Ctx): Res {
  const { a } = c;
  const v = c.s.v ?? 'caterpillar';
  const baby = [1.12, 1.04, 1][c.stage - 1] ?? 1;
  if (v === 'caterpillar') {
    const segs = [
      [31, 88, 8],
      [20, 86, 9.5],
      [8, 84, 10.5],
    ];
    for (const [x, , r] of segs) a.ellipse(x, 98, r * 0.4, 2.2, 'B');
    for (const [x, y, r] of segs) {
      a.circle(x, y, r, 'b');
      a.circle(x - r * 0.2, y - r * 0.55, r * 0.22, 'a', { deco: true });
    }
    headFront(c, -9, 74, 15 * baby);
    return;
  }
  if (v === 'ant') {
    for (const [lx, col] of [[-6, 'A'], [6, 'A'], [16, 'A'], [-10, 'a'], [2, 'a'], [12, 'a']] as const) {
      a.tube([2, 76, 1.3, lx + 3, 84, 1.2, lx, 98, 1.1], col);
    }
    const g = a.group();
    a.ellipse(21, 70, 14, 11.5, 'b', { g });
    a.ellipse(2, 74, 8, 6.5, 'b');
    if (has(c, 'bands')) for (const x of [15, 21, 27]) a.capsule(x, 60, x + 1, 80, 0.7, 0.7, 'A', { deco: true });
    headFront(c, -13, 60, 13.5 * baby);
    for (const s of SIDES) a.poly([-13 + s * 3, 70, -13 + s * 7, 72, -13 + s * 4, 75], 'a');
    return;
  }
  if (v === 'firefly') {
    for (const s of SIDES) a.ellipse(4 + s * 6, 40, 9, 15, 'l', { rot: s * 0.5 - 0.3 });
    const g = a.group();
    a.circle(22, 62, 11, 'x', { g, flat: true });
    a.circle(22, 62, 6, 'f1', { g, deco: true });
    a.ellipse(6, 58, 15, 11, 'b');
    for (const lx of [0, 8]) a.tube([lx, 66, 1, lx - 2, 74, 0.9], 'k');
    headFront(c, -12, 52, 12 * baby);
    a.sparkle(36, 52, '#fff6a0');
    a.sparkle(30, 76, '#fff6a0');
    return { float: true };
  }
  // beetle (front view)
  for (const s of SIDES) {
    for (const i of [0, 1, 2]) a.tube([s * 16, 62 + i * 9, 1.4, s * 30, 60 + i * 12, 1.3, s * 33, 66 + i * 14, 1.2], 'k');
  }
  for (const s of SIDES) {
    const g = a.group();
    a.capsule(s * 5, 40, s * 12, 26, 0.8, 0.7, 'k', { g });
    a.circle(s * 12.5, 25, 2.2, 'k', { g });
  }
  a.ellipse(0, 45, 13, 10, 'a');
  const g = a.group();
  a.ellipse(0, 72, 25, 22, 'b', { g });
  a.capsule(0, 51, 0, 93, 0.7, 0.7, 'A', { deco: true });
  if (has(c, 'spots')) {
    for (const [x, y, r] of [[-12, 62, 4.2], [12, 62, 4.2], [-15, 78, 3.8], [15, 78, 3.8], [-8, 88, 3.2], [8, 88, 3.2], [0, 52, 3.4]]) {
      a.circle(x, y, r, 'a', { deco: true });
    }
  }
  a.eye(-5, 45, 3.3, 'big', 0);
  a.eye(5, 45, 3.3, 'big', 0);
  if (has(c, 'blush')) for (const s of SIDES) a.ellipse(s * 9, 50, 2.2, 1.3, 'p', { deco: true });
}

function winged(c: Ctx): Res {
  const { a } = c;
  const v = c.s.v ?? 'butterfly';
  if (v === 'bat') {
    for (const s of SIDES) {
      const g = a.group();
      a.poly([s * 8, 44, s * 22, 26, s * 44, 32, s * 46, 56, s * 38, 52, s * 32, 62, s * 24, 55, s * 16, 62, s * 10, 56], 'a', { g });
      for (const t of [0.35, 0.65]) a.capsule(s * 12, 42, s * (12 + 32 * t), 34 + 22 * t, 0.6, 0.5, 'A', { g, deco: true });
    }
    for (const s of SIDES) a.ellipse(s * 6, 70, 2.6, 3, 'B');
    earsBack(c, 0, 50, 15);
    const g = a.group();
    a.circle(0, 52, 16, 'b', { g });
    a.ellipse(0, 60, 9, 8, 'l', { g });
    face(c, 0, 50, 14, 0);
    return { float: true };
  }
  if (v === 'fairy') {
    for (const s of SIDES) {
      a.ellipse(s * 18, 42, 12, 8, 'a', { rot: -s * 0.6 });
      a.ellipse(s * 16, 58, 8, 6, 'a', { rot: s * 0.5 });
    }
    for (const s of SIDES) a.ellipse(s * 6, 74, 4, 3, 'B');
    if (has(c, 'arms')) for (const s of SIDES) a.ellipse(s * 17, 58, 4, 3, 'b', { rot: s * 0.4 });
    earsBack(c, 0, 54, 17);
    const g = a.group();
    a.circle(0, 54, 17, 'b', { g });
    a.ellipse(0, 61, 10, 7, 'l', { g });
    headTop(c, 0, 38, 17);
    face(c, 0, 52, 16, 0);
    a.sparkle(-30, 30, '#f8e070');
    a.sparkle(30, 70, '#f8e070');
    if (c.stage > 1) a.sparkle(28, 26, '#ffffff');
    return { float: true };
  }
  // butterfly
  for (const s of SIDES) {
    const g = a.group();
    a.ellipse(s * 17, 40, 19, 15, 'b', { g, rot: -s * 0.55 });
    a.ellipse(s * 13, 64, 12, 10, 'b', { g, rot: s * 0.45 });
    a.circle(s * 20, 38, 6.5, 'a', { deco: true });
    a.circle(s * 20, 38, 3, 'l', { deco: true });
    a.circle(s * 14, 66, 3.5, 'a', { deco: true });
  }
  for (const s of SIDES) {
    const g = a.group();
    a.tube([s * 2, 30, 0.7, s * 6, 18, 0.6, s * 11, 15, 0.6], 'x', { g });
    a.circle(s * 12, 15, 2, 'x', { g });
  }
  a.ellipse(0, 54, 5, 17, 'x');
  a.circle(0, 34, 8.5, 'x');
  a.eye(-3.2, 34, 2.6, 'big', 0);
  a.eye(3.2, 34, 2.6, 'big', 0);
  return { float: true };
}

function plant(c: Ctx): Res {
  const { a } = c;
  const v = c.s.v ?? 'sprout';
  switch (v) {
    case 'flower': {
      const big = c.stage > 1;
      a.capsule(0, 98, 0, 66, 4.5, 4, 'g');
      leaf(a, 0, 82, 16, -0.4);
      leaf(a, 0, 78, 16, Math.PI + 0.4);
      for (const s of SIDES) a.ellipse(s * 5, 98, 5, 2.4, 'G');
      const g = a.group();
      const n = big ? 8 : 6;
      for (let i = 0; i < n; i++) {
        const ang = UP + (i / n) * Math.PI * 2;
        a.circle(Math.cos(ang) * 16, 46 + Math.sin(ang) * 16, big ? 9 : 9.5, 'b', { g });
      }
      if (has(c, 'h-crown')) headTop(c, 0, 22, 14);
      const gc = a.group();
      a.circle(0, 46, 12.5, 'l', { g: gc });
      face(c, 0, 46, 12, 0);
      return;
    }
    case 'mushroom': {
      for (const s of SIDES) a.ellipse(s * 7, 98, 5.5, 2.6, 'L');
      const g = a.group();
      a.ellipse(0, 60, 29, 22, 'b', { g });
      a.rect(-32, 64, 64, 20, null);
      for (const [x, y, r] of [[-14, 52, 4], [6, 45, 5], [18, 56, 3.5], [-3, 58, 2.6]]) a.circle(x, y, r, 'a', { deco: true });
      if (has(c, 'arms')) for (const s of SIDES) a.capsule(s * 10, 76, s * 19, 84, 2.6, 2.4, 'l');
      a.rrect(-11, 62, 22, 36, 8, 'l');
      face(c, 0, 80, 11, 0);
      return;
    }
    case 'tree': {
      if (has(c, 'arms')) {
        for (const s of SIDES) {
          a.tube([s * 10, 66, 2.6, s * 22, 58, 2.2, s * 26, 48, 1.8], 'n');
          leaf(a, s * 26, 48, 10, UP + s * 0.6);
        }
      }
      for (const s of SIDES) a.ellipse(s * 9, 97, 6.5, 3, 'N');
      a.rrect(-11, 54, 22, 44, 6, 'x');
      const g = a.group();
      const crown = c.stage > 1 ? [[0, 30, 20], [-17, 40, 14], [17, 40, 14], [-9, 20, 12], [10, 20, 12]] : [[0, 36, 17], [-13, 44, 11], [13, 44, 11]];
      for (const [x, y, r] of crown) a.circle(x, y, r, 'b', { g });
      for (const [x, y] of [[-8, 34], [9, 40], [0, 26]]) a.circle(x, y, 2.2, 'l', { deco: true });
      if (has(c, 'flowers')) for (const [x, y] of [[-14, 38], [12, 26], [16, 46]]) a.circle(x, y, 2.4, 'p', { deco: true });
      face(c, 0, 74, 10, 0);
      return;
    }
    case 'cactus': {
      for (const s of SIDES) {
        const g = a.group();
        a.capsule(s * 10, 68, s * 22, 68, 5, 5, 'b', { g });
        a.capsule(s * 22, 68, s * 22, 50, 5, 4.6, 'b', { g });
        if (has(c, 'fists')) a.circle(s * 22, 48, 7, 'a');
      }
      for (const s of SIDES) a.ellipse(s * 7, 98, 6, 2.6, 'B');
      const g = a.group();
      a.rrect(-12, 32, 24, 66, 12, 'b', { g });
      for (const [x, y] of [[-7, 46], [7, 52], [-6, 84], [6, 90], [0, 38]]) a.circle(x, y, 1, 'l', { deco: true });
      flower(a, 2, 30, 7, 'a', 'y');
      face(c, 0, 58, 10, 0);
      return;
    }
    case 'carrot': {
      const g0 = a.group();
      leaf(a, 0, 40, 16, UP - 0.5, 'g', g0);
      leaf(a, 0, 40, 18, UP, 'g', g0);
      leaf(a, 0, 40, 16, UP + 0.5, 'g', g0);
      if (has(c, 'arms')) for (const s of SIDES) a.capsule(s * 14, 60, s * 24, 66, 2.4, 2.2, 'b');
      for (const s of SIDES) a.ellipse(s * 5, 97.5, 4.5, 2.4, 'B');
      const g = a.group();
      a.poly([-19, 44, 19, 44, 4, 96, -4, 96], 'b', { g });
      a.ellipse(0, 45, 19, 7, 'b', { g });
      for (const [x, y, w] of [[-8, 60, 5], [7, 70, 5], [-3, 82, 4]]) a.capsule(x - w, y, x + w, y, 0.6, 0.6, 'a', { deco: true });
      face(c, 0, 54, 13, 0);
      return;
    }
    case 'pepper': {
      a.tube([0, 32, 3, 0, 24, 2, 5, 18, 1.6], 'G');
      if (has(c, 'arms')) for (const s of SIDES) a.capsule(s * 12, 62, s * 22, 70, 2.4, 2.2, 'b');
      const g = a.group();
      a.tube([0, 46, 15, 2, 62, 13, 6, 78, 9, 12, 92, 4], 'b', { g });
      a.ellipse(-6, 50, 3, 6, 'l', { deco: true, rot: 0.3 });
      const gc = a.group();
      a.ellipse(0, 35, 12, 5, 'a', { g: gc });
      if (has(c, 'h-flame')) {
        for (const s of SIDES) flame(a, s * 16, 46, 4.5);
      }
      face(c, 0, 52, 12, 0);
      return;
    }
    case 'strawberry': {
      for (const s of SIDES) a.ellipse(s * 7, 98, 4.5, 2.2, 'B');
      const g = a.group();
      a.ellipse(0, 64, 24, 21, 'b', { g });
      a.poly([-22, 70, 22, 70, 0, 96], 'b', { g });
      for (const [x, y] of [[-12, 70], [12, 70], [0, 82], [-6, 88], [6, 88], [-16, 58], [16, 58]]) a.ellipse(x, y, 1.2, 1.6, 'x', { deco: true });
      a.poly(starPts(0, 44, 14, 6, 5, UP + Math.PI / 5), 'a');
      face(c, 0, 64, 13, 0);
      return;
    }
    case 'zucchini': {
      if (has(c, 'arms')) for (const s of SIDES) a.capsule(s * 13, 64, s * 22, 72, 2.4, 2.2, 'b');
      for (const s of SIDES) a.ellipse(s * 6, 97.5, 5, 2.4, 'B');
      const g = a.group();
      a.capsule(0, 44, 0, 84, 15, 14, 'b', { g });
      for (const x of [-7, 7]) a.capsule(x, 34, x, 92, 0.8, 0.8, 'l', { deco: true });
      a.tube([0, 30, 3, 2, 22, 2.4], 'a');
      a.circle(0, 98, 3, 'x');
      face(c, 0, 52, 12, 0);
      return;
    }
    default: {
      // sprout: a round bulb with leaves on top
      for (const s of SIDES) a.ellipse(s * 8, 97.5, 6, 3, 'B');
      if (has(c, 'arms')) for (const s of SIDES) a.ellipse(s * 21, 80, 5, 3.6, 'b', { rot: s * 0.5 });
      const g = a.group();
      a.ellipse(0, 79, 20, 18, 'b', { g });
      a.ellipse(0, 86, 12, 9, 'l', { g });
      headTop(c, 0, 61, 20);
      face(c, 0, 76, 16, 0);
    }
  }
}

function ghost(c: Ctx): Res {
  const { a, P } = c;
  const v = c.s.v ?? 'sheet';
  if (v === 'shadow') {
    a.tube([10, 68, 9, 22, 80, 6, 30, 76, 3.5, 32, 68, 2], 'b');
    const g = a.group();
    a.circle(0, 52, 21, 'b', { g });
    for (let i = 0; i < 6; i++) {
      const ang = UP + (i - 2.5) * 0.42;
      const x = Math.cos(ang);
      const y = Math.sin(ang);
      a.poly([x * 14 - y * 5, 52 + y * 14 + x * 5, x * 32, 52 + y * 32, x * 14 + y * 5, 52 + y * 14 - x * 5], 'b', { g });
    }
    for (const s of SIDES) a.ellipse(s * 23, 58, 6, 4, 'b', { rot: s * 0.6 });
    a.eye(-7, 50, 4.4, 'glow', -1, c.s.c[2]);
    a.eye(7, 50, 4.4, 'glow', -1, c.s.c[2]);
    a.mouth(0, 59, 8, 'fang');
    return { float: true };
  }
  if (v === 'mist') {
    a.tube([8, 66, 8, 18, 76, 5.5, 14, 86, 3, 4, 88, 1.5], 'b');
    const g = a.group();
    for (const [x, y, r] of [[0, 48, 17], [-14, 54, 11], [14, 54, 11], [-8, 36, 10], [9, 36, 10]]) a.circle(x, y, r, 'b', { g });
    a.ellipse(-8, 40, 5, 2.5, 'w', { deco: true, rot: -0.4 });
    face(c, 0, 50, 14, 0);
    return { float: true };
  }
  const W = P.w ?? 22;
  for (const s of SIDES) a.ellipse(s * (W + 2), 58, 6.5, 4.6, 'b', { rot: s * 0.55 });
  const g = a.group();
  a.circle(0, 42, W, 'b', { g });
  a.poly([-W, 42, -W, 72, -W * 0.66, 80, -W * 0.33, 72, 0, 80, W * 0.33, 72, W * 0.66, 80, W, 72, W, 42], 'b', { g });
  if (has(c, 'h-crown')) headTop(c, 0, 20, W);
  if (has(c, 'spots')) for (const [x, y] of [[-12, 66], [10, 70], [14, 54]]) a.circle(x, y, 2.6, 'a', { deco: true });
  face(c, 0, 44, W * 0.9, 0);
  return { float: true };
}

function rock(c: Ctx): Res {
  const { a } = c;
  const v = c.s.v ?? 'pebble';
  if (v === 'crystal') {
    const prisms = c.stage > 1 ? [[-22, 62, 9], [22, 58, 9], [-11, 46, 10], [12, 44, 10], [0, 34, 13]] : [[-16, 60, 9], [16, 58, 9], [0, 38, 14]];
    prisms.forEach(([x, top, w], i) => {
      const g = a.group();
      a.poly([x - w, 98, x - w, top + w, x, top, x + w, top + w, x + w, 98], i === prisms.length - 1 ? 'b' : 'a', { g });
      a.poly([x - w * 0.55, 96, x - w * 0.55, top + w * 1.2, x - w * 0.1, top + w * 0.6, x - w * 0.1, 96], 'l', { g, deco: true });
    });
    face(c, 0, 66, 12, 0);
    return;
  }
  if (v === 'golem') {
    for (const s of SIDES) a.poly(rockPts(s * 11, 90, 8, 9, 6, 3 + s), 'B');
    for (const s of SIDES) {
      a.poly(rockPts(s * 33, 62, 9, 10, 7, 5 + s), 'b');
      a.poly(rockPts(s * 35, 80, 10, 9, 7, 9 + s), 'b');
    }
    const g = a.group();
    a.poly(rockPts(0, 64, 28, 23, 9, 1), 'b', { g });
    a.poly(rockPts(-6, 58, 14, 10, 6, 4), 'l', { g, deco: true });
    if (has(c, 'crystals')) for (const [x, y] of [[-18, 44], [14, 42]]) a.poly([x - 4, y + 4, x, y - 8, x + 4, y + 4], 'x');
    const gh = a.group();
    a.poly(rockPts(0, 36, 14, 12, 7, 2), 'b', { g: gh });
    face(c, 0, 37, 11, 0);
    return;
  }
  if (v === 'boulder') {
    for (const s of SIDES) a.poly(rockPts(s * 31, 76, 9, 8, 7, 6 + s), 'b');
    if (has(c, 'crystals')) for (const [x, y] of [[-14, 50], [10, 47]]) a.poly([x - 4, y + 5, x, y - 8, x + 4, y + 5], 'x');
    const g = a.group();
    a.poly(rockPts(0, 72, 27, 25, 9, 7), 'b', { g });
    a.poly(rockPts(-8, 64, 12, 9, 6, 8), 'l', { g, deco: true });
    face(c, 0, 72, 17, 0);
    return;
  }
  // pebble
  for (const s of SIDES) a.ellipse(s * 11, 98, 6.5, 2.6, 'B');
  const g = a.group();
  a.poly(rockPts(0, 73, 29, 25, 8, 3), 'b', { g });
  a.poly(rockPts(-9, 65, 11, 8, 6, 5), 'l', { g, deco: true });
  face(c, 0, 74, 19, 0);
}

function shell(c: Ctx): Res {
  const { a } = c;
  const v = c.s.v ?? 'turtle';
  if (v === 'crab') {
    for (const s of SIDES) {
      for (const i of [0, 1, 2]) a.tube([s * 16, 80 + i * 3, 1.8, s * (30 + i * 3), 82 + i * 3, 1.6, s * (34 + i * 2), 97, 1.4], 'B');
    }
    const big = c.stage > 1 ? 1.25 : 1;
    for (const s of SIDES) {
      a.tube([s * 18, 74, 3, s * 28, 62, 3, s * 31, 52, 3], 'b');
      const g = a.group();
      a.circle(s * 32, 42, 10 * big, 'b', { g });
      a.poly([s * 32, 42, s * (32 - 10 * big), 28, s * (32 + 2 * big), 28], null);
      if (has(c, 'spikes')) a.poly([s * 40, 46, s * 46, 40, s * 42, 50], 'a');
    }
    for (const s of SIDES) {
      a.capsule(s * 7, 70, s * 9, 58, 1.8, 1.6, 'b');
      a.circle(s * 9, 55, 4.6, 'w');
      a.eye(s * 9, 55, 2.4, 'dot', 0);
    }
    const g = a.group();
    a.ellipse(0, 79, 26, 15, 'b', { g });
    a.ellipse(0, 85, 17, 8, 'l', { g });
    a.mouth(0, 80, 10, c.mouth);
    if (has(c, 'blush')) for (const s of SIDES) a.ellipse(s * 13, 80, 3, 1.8, 'p', { deco: true });
    return;
  }
  if (v === 'clam') {
    for (const s of SIDES) a.ellipse(s * 7, 98, 5, 2.4, 'B');
    const g = a.group();
    const pts: number[] = [];
    const R = 27;
    for (let i = 0; i <= 12; i++) {
      const ang = Math.PI + (i / 12) * Math.PI;
      const rr = has(c, 'spikes') && i % 2 === 1 ? R + 5 : R;
      pts.push(Math.cos(ang) * rr, 84 + Math.sin(ang) * rr);
    }
    a.poly(pts, 'b', { g });
    a.poly([-10, 84, 10, 84, 6, 96, -6, 96], 'b', { g });
    for (const ang of [-2.6, -2.1, -1.57, -1.05, -0.55]) {
      a.capsule(Math.cos(ang) * 8, 88 + Math.sin(ang) * 8, Math.cos(ang) * 25, 86 + Math.sin(ang) * 25, 0.6, 0.6, 'a', { deco: true });
    }
    a.circle(20, 93, 6, 'x');
    face(c, 0, 72, 13, 0);
    return;
  }
  // sea turtle (side view)
  a.ellipse(-12, 90, 9, 4, 'B', { rot: -0.3 });
  a.ellipse(22, 91, 7, 3.4, 'B', { rot: 0.4 });
  if (has(c, 'palm')) {
    a.capsule(10, 56, 12, 36, 1.6, 1.4, 'n');
    const g = a.group();
    for (const ang of [-2.6, -1.9, -1.2, -0.6]) leaf(a, 12, 36, 14, ang, 'g', g);
  }
  const g = a.group();
  a.ellipse(6, 74, 27, 19, 'a', { g });
  a.rect(-24, 82, 60, 20, null);
  a.ellipse(6, 81, 27, 4, 'l', { g });
  for (const [x, y] of [[-6, 70], [8, 66], [20, 72], [6, 76]]) a.poly(rockPts(x, y, 4.2, 3.6, 6, x), 'A', { deco: true });
  if (has(c, 'spikes')) {
    const gs = a.group();
    for (const [x, y] of [[-8, 58], [6, 55], [20, 59]]) a.poly([x - 3, y + 2, x, y - 5, x + 3, y + 2], 'l', { g: gs });
  }
  a.ellipse(-10, 92, 10, 4.2, 'b', { rot: -0.25 });
  a.ellipse(22, 93, 7, 3.8, 'b', { rot: 0.35 });
  a.capsule(-14, 80, -24, 72, 4.5, 4.2, 'b');
  headFront(c, -27, 64, 11 * ([1.12, 1.04, 1][c.stage - 1] ?? 1));
}

function jelly(c: Ctx): Res {
  const { a } = c;
  const v = c.s.v ?? 'jellyfish';
  if (v === 'octopus') {
    const tent = [[-20, -1], [-12, -1], [-4, -1], [4, 1], [12, 1], [20, 1]];
    for (const [x, d] of tent) {
      a.tube([x * 0.7, 62, 4.2, x, 80, 3.6, x + d * 6, 94, 2.8, x + d * 12, 92, 2, x + d * 11, 86, 1.4], 'b');
      a.circle(x + d * 2, 86, 0.9, 'l', { deco: true });
    }
    const g = a.group();
    a.ellipse(0, 48, 22, 21, 'b', { g });
    if (has(c, 'spots')) for (const [x, y] of [[-12, 36], [10, 32], [14, 44]]) a.circle(x, y, 2.4, 'a', { deco: true });
    face(c, 0, 52, 15, 0);
    return;
  }
  const g = a.group();
  a.ellipse(0, 48, 26, 22, 'b', { g });
  a.rect(-30, 53, 60, 30, null);
  a.ellipse(0, 53, 26, 4.4, 'l', { g });
  a.ellipse(-12, 36, 5, 3, 'w', { deco: true, rot: -0.5 });
  for (let i = 0; i < 5; i++) {
    const x = -16 + i * 8;
    const s = i % 2 === 0 ? 1 : -1;
    a.tube([x, 56, 2.6, x + 4 * s, 67, 2.2, x - 3 * s, 79, 1.8, x + 2 * s, 91, 1.4], 'a');
  }
  face(c, 0, 42, 15, 0);
  return { float: true };
}

function dragon(c: Ctx): Res {
  const { a } = c;
  const v = c.s.v ?? 'wyvern';
  const baby = [1.12, 1.04, 1][c.stage - 1] ?? 1;
  if (v === 'baby') {
    a.tube([12, 86, 5, 24, 90, 4, 32, 84, 2.5], 'b');
    if (has(c, 't-flame')) flame(a, 33, 84, 5);
    const gw = a.group();
    a.poly([8, 70, 6, 50, 20, 52, 26, 64], 'a', { g: gw });
    for (const s of SIDES) a.ellipse(4 + s * 9, 97, 6, 3, 'B');
    const g = a.group();
    a.ellipse(4, 80, 17, 15, 'b', { g });
    a.ellipse(1, 85, 10, 9, 'l', { g });
    for (const s of SIDES) a.ellipse(4 + s * 15, 82, 3.6, 2.6, 'b', { rot: s * 0.5 });
    headFront(c, -5, 56, 16 * baby, { muzzle: 0.2 });
    return;
  }
  if (v === 'rex') {
    a.tube([12, 72, 9, 26, 80, 7, 40, 83, 4.5, 48, 77, 2], 'b');
    if (has(c, 'spikes')) backSpikes(c, 6, 66, 14, 18, 4, 6.5, -0.6, 0.9);
    legQ(a, 14, 76, 8, 'B');
    const g = a.group();
    a.ellipse(6, 68, 15, 18, 'b', { g, rot: 0.4 });
    a.ellipse(0, 74, 9, 12, 'l', { g, rot: 0.4 });
    legQ(a, 2, 78, 8.5, 'b');
    a.capsule(-6, 66, -12, 72, 2.2, 1.8, 'b');
    const gh = a.group();
    a.ellipse(-12, 40, 16, 13, 'b', { g: gh });
    a.ellipse(-20, 49, 13, 6, 'b', { g: gh });
    a.ellipse(-22, 50, 10, 3, 'l', { g: gh });
    a.eye(-12, 36, 3.6 * baby, c.eye, -1);
    a.mouth(-26, 47, 10, 'grin');
    a.ellipse(-30, 41, 1, 0.8, 'k', { deco: true });
    return;
  }
  // wyvern (side view, facing left)
  const gw = a.group();
  a.poly([4, 56, -6, 16, 6, 10, 14, 20, 24, 8, 26, 24, 34, 18, 30, 36, 22, 50], 'A', { g: gw });
  if (has(c, 't-flame')) {
    a.tube([20, 76, 8, 34, 80, 6, 44, 72, 4], 'b');
    flame(a, 46, 70, 7);
  } else {
    a.tube([20, 76, 8, 34, 80, 6, 44, 72, 4, 46, 60, 2.5], 'b');
    a.poly([42, 62, 48, 50, 52, 62], 'a');
  }
  legQ(a, 18, 78, 9, 'B');
  if (has(c, 'spikes')) backSpikes(c, 8, 68, 20, 16, 4, 7, -0.4, 0.7);
  const g = a.group();
  a.ellipse(8, 70, 20, 16, 'b', { g, rot: -0.15 });
  a.ellipse(2, 76, 12, 11, 'l', { g });
  for (const y of [70, 75, 80]) a.capsule(-6, y, 10, y + 1, 0.5, 0.5, 'L', { deco: true });
  a.tube([-2, 64, 8, -10, 50, 7, -16, 40, 6.5], 'b', { g });
  legQ(a, -2, 80, 9.5, 'b');
  const gh = a.group();
  if (has(c, 'h-horns')) for (const dx of [0, 6]) a.poly([-16 + dx, 26, -6 + dx, 12, -10 + dx, 28], 'x');
  a.ellipse(-20, 32, 12, 10, 'b', { g: gh });
  a.ellipse(-31, 36, 8.5, 6, 'b', { g: gh });
  a.ellipse(-36, 34, 1, 0.8, 'k', { deco: true });
  a.eye(-20, 29, 3.6 * baby, c.eye, -1);
  a.mouth(-32, 40, 6, 'smile');
  const gw2 = a.group();
  a.poly([6, 54, 8, 10, 26, 2, 30, 17, 46, 9, 41, 27, 47, 34, 34, 40, 33, 49], 'a', { g: gw2 });
  for (const [x2, y2] of [[26, 4], [44, 11], [45, 33]]) a.capsule(10, 50, x2, y2, 0.6, 0.5, 'A', { g: gw2, deco: true });
}

const ARCH: Record<Arch, (c: Ctx) => Res> = {
  quad,
  biped,
  blob,
  bird,
  fish,
  serpent,
  bug,
  winged,
  plant,
  ghost,
  rock,
  shell,
  jelly,
  dragon,
};

export const PORTRAIT_SIZE = 56;

/** Draw a creature portrait as an RGBA pixel image. */
export function drawCreature(spec: ArtSpec, stage: number, size = PORTRAIT_SIZE): PixelImage {
  const a = new Art();
  const c: Ctx = {
    a,
    s: spec,
    F: new Set(spec.f ?? []),
    P: { ...(spec.p ?? {}) },
    stage,
    eye: spec.e ?? 'dot',
    mouth: spec.m ?? 'smile',
  };
  const res = ARCH[spec.k](c) || {};
  if (c.F.has('aura')) {
    for (const [x, y] of [[-44, 18], [42, 30], [-38, 80], [44, 84], [0, 4]]) a.sparkle(x, y, '#f8e070');
  }
  const pal = paletteFor(spec);
  const outline = mix(pal.b, '#120a1a', 0.84);
  return renderArt(a, pal, {
    size,
    scale: spec.s ?? 1,
    float: !!res.float || c.F.has('float'),
    outline,
  });
}
