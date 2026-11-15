// A tiny software rasterizer that turns simple vector shapes into crisp
// pixel art (with automatic outlines, inner contour lines and shading).
// It has no DOM dependency, so it also runs in Node (tests / previews).

export type RGB = [number, number, number];

export function hexToRgb(h: string): RGB {
  const s = h.replace('#', '');
  if (s.length === 3) {
    return [parseInt(s[0] + s[0], 16), parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16)];
  }
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export const darken = (c: string, t = 0.3) => mix(c, '#160c22', t);
export const lighten = (c: string, t = 0.3) => mix(c, '#ffffff', t);

export type EyeStyle = 'dot' | 'big' | 'happy' | 'angry' | 'sleepy' | 'shine' | 'glow';
export type MouthStyle = 'smile' | 'open' | 'fang' | 'cat' | 'flat' | 'o' | 'grin' | 'none' | 'tongue';

interface ShapeBase {
  col: string | null; // palette key, '#rrggbb', or null = erase
  g: number; // group id: shapes of one group share outline & shading
  deco: boolean; // decoration: painted on top, no shading, no contour lines
  flat: boolean; // no shading
}

type Geo =
  | { t: 'e'; cx: number; cy: number; rx: number; ry: number; rot: number }
  | { t: 'p'; pts: number[] }
  | { t: 'c'; x1: number; y1: number; x2: number; y2: number; r1: number; r2: number };

export type Shape = ShapeBase & Geo;

export interface ShapeOpts {
  g?: number;
  deco?: boolean;
  flat?: boolean;
  rot?: number;
}

export interface EyeDeco {
  x: number;
  y: number;
  s: number;
  style: EyeStyle;
  look: number;
  col?: string;
}

/**
 * Shape builder. Coordinates are "units" in a 100x100 box:
 * x in [-50, 50] (0 = center), y in [0, 100] (100 = ground line).
 */
export class Art {
  shapes: Shape[] = [];
  eyes: EyeDeco[] = [];
  mouths: { x: number; y: number; w: number; style: MouthStyle; col?: string }[] = [];
  sparkles: { x: number; y: number; col: string }[] = [];
  private gid = 0;

  group(): number {
    return ++this.gid;
  }

  private add(geo: Geo, col: string | null, o: ShapeOpts = {}) {
    this.shapes.push({ ...geo, col, g: o.g ?? this.group(), deco: !!o.deco, flat: !!o.flat || !!o.deco } as Shape);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, col: string | null, o: ShapeOpts = {}) {
    this.add({ t: 'e', cx, cy, rx, ry, rot: o.rot ?? 0 }, col, o);
  }

  circle(cx: number, cy: number, r: number, col: string | null, o: ShapeOpts = {}) {
    this.ellipse(cx, cy, r, r, col, o);
  }

  poly(pts: number[], col: string | null, o: ShapeOpts = {}) {
    this.add({ t: 'p', pts }, col, o);
  }

  rect(x: number, y: number, w: number, h: number, col: string | null, o: ShapeOpts = {}) {
    this.poly([x, y, x + w, y, x + w, y + h, x, y + h], col, o);
  }

  rrect(x: number, y: number, w: number, h: number, r: number, col: string | null, o: ShapeOpts = {}) {
    const g = o.g ?? this.group();
    const oo = { ...o, g };
    this.rect(x + r, y, w - 2 * r, h, col, oo);
    this.rect(x, y + r, w, h - 2 * r, col, oo);
    this.circle(x + r, y + r, r, col, oo);
    this.circle(x + w - r, y + r, r, col, oo);
    this.circle(x + r, y + h - r, r, col, oo);
    this.circle(x + w - r, y + h - r, r, col, oo);
  }

  capsule(x1: number, y1: number, x2: number, y2: number, r1: number, r2: number, col: string | null, o: ShapeOpts = {}) {
    this.add({ t: 'c', x1, y1, x2, y2, r1, r2 }, col, o);
  }

  /** A chain of capsules through [x, y, r, x, y, r, ...]. */
  tube(pts: number[], col: string | null, o: ShapeOpts = {}) {
    const g = o.g ?? this.group();
    for (let i = 0; i + 5 < pts.length; i += 3) {
      this.capsule(pts[i], pts[i + 1], pts[i + 3], pts[i + 4], pts[i + 2], pts[i + 5], col, { ...o, g });
    }
  }

  eye(x: number, y: number, s: number, style: EyeStyle, look = 0, col?: string) {
    this.eyes.push({ x, y, s, style, look, col });
  }

  mouth(x: number, y: number, w: number, style: MouthStyle, col?: string) {
    this.mouths.push({ x, y, w, style, col });
  }

  sparkle(x: number, y: number, col = '#ffffff') {
    this.sparkles.push({ x, y, col });
  }
}

export interface RenderOpts {
  size: number;
  scale: number;
  float: boolean;
  outline: string;
  eye?: string;
}

export interface PixelImage {
  w: number;
  h: number;
  data: Uint8ClampedArray; // RGBA
}

function pointInPoly(px: number, py: number, pts: number[]): boolean {
  let inside = false;
  const n = pts.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[i * 2];
    const yi = pts[i * 2 + 1];
    const xj = pts[j * 2];
    const yj = pts[j * 2 + 1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const shadeCache = new Map<string, string>();
function shadeOf(c: string): string {
  let s = shadeCache.get(c);
  if (!s) {
    // Darker and slightly cooler: a classic pixel-art shading trick.
    s = mix(c, '#2a1e5a', 0.32);
    shadeCache.set(c, s);
  }
  return s;
}

const lineCache = new Map<string, string>();
function lineOf(c: string): string {
  let s = lineCache.get(c);
  if (!s) {
    s = mix(c, '#140a20', 0.62);
    lineCache.set(c, s);
  }
  return s;
}

const hiCache = new Map<string, string>();
function highlightOf(c: string): string {
  let s = hiCache.get(c);
  if (!s) {
    s = mix(c, '#ffffff', 0.38);
    hiCache.set(c, s);
  }
  return s;
}

/** Rasterize an Art description into an RGBA pixel image. */
export function renderArt(art: Art, pal: Record<string, string>, o: RenderOpts): PixelImage {
  const N = o.size;
  const k = ((N - 6) / 100) * o.scale;
  const X = (x: number) => N / 2 + x * k;
  const Y = o.float ? (y: number) => N / 2 + (y - 50) * k : (y: number) => N - 3 - (100 - y) * k;
  const resolve = (c: string) => pal[c] ?? c;

  const col: (string | null)[] = new Array(N * N).fill(null);
  const grp = new Int32Array(N * N).fill(-1);
  const deco = new Uint8Array(N * N);
  const flat = new Uint8Array(N * N);

  for (const s of art.shapes) {
    const c = s.col === null ? null : resolve(s.col);
    let x0: number, x1: number, y0: number, y1: number;
    let inside: (px: number, py: number) => boolean;
    if (s.t === 'e') {
      const cx = X(s.cx);
      const cy = Y(s.cy);
      const rx = Math.max(0.72, s.rx * k);
      const ry = Math.max(0.72, s.ry * k);
      const cos = Math.cos(s.rot);
      const sin = Math.sin(s.rot);
      const R = Math.max(rx, ry);
      x0 = cx - R;
      x1 = cx + R;
      y0 = cy - R;
      y1 = cy + R;
      inside = (px, py) => {
        const dx = px - cx;
        const dy = py - cy;
        const u = dx * cos + dy * sin;
        const v = -dx * sin + dy * cos;
        return (u * u) / (rx * rx) + (v * v) / (ry * ry) <= 1;
      };
    } else if (s.t === 'p') {
      const pts = s.pts.map((v, i) => (i % 2 === 0 ? X(v) : Y(v)));
      x0 = Infinity;
      y0 = Infinity;
      x1 = -Infinity;
      y1 = -Infinity;
      for (let i = 0; i < pts.length; i += 2) {
        x0 = Math.min(x0, pts[i]);
        x1 = Math.max(x1, pts[i]);
        y0 = Math.min(y0, pts[i + 1]);
        y1 = Math.max(y1, pts[i + 1]);
      }
      inside = (px, py) => pointInPoly(px, py, pts);
    } else {
      const ax = X(s.x1);
      const ay = Y(s.y1);
      const bx = X(s.x2);
      const by = Y(s.y2);
      const ra = Math.max(0.62, s.r1 * k);
      const rb = Math.max(0.62, s.r2 * k);
      const R = Math.max(ra, rb);
      x0 = Math.min(ax, bx) - R;
      x1 = Math.max(ax, bx) + R;
      y0 = Math.min(ay, by) - R;
      y1 = Math.max(ay, by) + R;
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy || 1e-6;
      inside = (px, py) => {
        let t = ((px - ax) * dx + (py - ay) * dy) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const qx = ax + dx * t - px;
        const qy = ay + dy * t - py;
        const r = ra + (rb - ra) * t;
        return qx * qx + qy * qy <= r * r;
      };
    }
    const ix0 = Math.max(0, Math.floor(x0) - 1);
    const ix1 = Math.min(N - 1, Math.ceil(x1) + 1);
    const iy0 = Math.max(0, Math.floor(y0) - 1);
    const iy1 = Math.min(N - 1, Math.ceil(y1) + 1);
    for (let py = iy0; py <= iy1; py++) {
      for (let px = ix0; px <= ix1; px++) {
        if (!inside(px + 0.5, py + 0.5)) continue;
        const i = py * N + px;
        if (c === null) {
          col[i] = null;
          grp[i] = -1;
          deco[i] = 0;
          flat[i] = 0;
        } else if (s.deco) {
          // Decorations only paint over existing pixels of the creature.
          if (grp[i] < 0) continue;
          col[i] = c;
          deco[i] = 1;
        } else {
          col[i] = c;
          grp[i] = s.g;
          deco[i] = 0;
          flat[i] = s.flat ? 1 : 0;
        }
      }
    }
  }

  // Group sizes decide how much shading a part gets.
  const gsize = new Map<number, number>();
  for (let i = 0; i < N * N; i++) {
    if (grp[i] >= 0) gsize.set(grp[i], (gsize.get(grp[i]) ?? 0) + 1);
  }
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= N || y >= N ? -1 : grp[y * N + x]);

  const out: (string | null)[] = col.slice();

  // 1) Shading (light from the top-left).
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const g = grp[i];
      if (g < 0 || deco[i] || flat[i]) continue;
      const size = gsize.get(g) ?? 0;
      if (size < 14) continue;
      const w = size > 300 ? 2 : 1;
      let shadow = false;
      for (let d = 1; d <= w; d++) {
        if (at(x + d, y + d) !== g) shadow = true;
      }
      if (shadow) {
        out[i] = shadeOf(col[i]!);
      } else if (size > 90 && at(x - 1, y - 1) !== g && at(x - 1, y) === g && at(x, y - 1) === g) {
        out[i] = highlightOf(col[i]!);
      }
    }
  }

  // 2) Inner contour lines where a front part overlaps a back part.
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const g = grp[i];
      if (g < 0 || deco[i]) continue;
      const n4 = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
      const ni = [i - 1, i + 1, i - N, i + N];
      for (let q = 0; q < 4; q++) {
        if (n4[q] > g && !deco[ni[q]]) {
          out[i] = lineOf(col[i]!);
          break;
        }
      }
    }
  }

  // 3) Eyes and mouths (pixel-precise decorations).
  const EYE = o.eye ?? '#1c1424';
  const put = (x: number, y: number, c: string) => {
    if (x < 0 || y < 0 || x >= N || y >= N) return;
    const i = y * N + x;
    if (grp[i] < 0) return;
    out[i] = c;
  };
  for (const e of art.eyes) {
    const cx = X(e.x);
    const cy = Y(e.y);
    const h = Math.max(2, Math.min(8, Math.round(e.s * k * 2)));
    const w = Math.max(2, Math.round(h * 0.72));
    const x0 = Math.round(cx - w / 2);
    const y0 = Math.round(cy - h / 2);
    const inEll = (xx: number, yy: number, ww: number, hh: number) => {
      const u = ((xx + 0.5) / ww) * 2 - 1;
      const v = ((yy + 0.5) / hh) * 2 - 1;
      return u * u + v * v <= 1.2;
    };
    switch (e.style) {
      case 'happy': {
        const ww = Math.max(3, w + 1);
        const bx = Math.round(cx - ww / 2);
        const by = Math.round(cy);
        for (let xx = 0; xx < ww; xx++) {
          const edge = xx === 0 || xx === ww - 1;
          put(bx + xx, by + (edge ? 0 : -1), EYE);
        }
        break;
      }
      case 'sleepy': {
        const ww = Math.max(3, w + 1);
        const bx = Math.round(cx - ww / 2);
        const by = Math.round(cy);
        for (let xx = 0; xx < ww; xx++) put(bx + xx, by, EYE);
        if (ww >= 4) {
          put(bx, by - 1, EYE);
          put(bx + ww - 1, by - 1, EYE);
        }
        break;
      }
      case 'big': {
        const W = w + 2;
        const H = h + 1;
        const bx = Math.round(cx - W / 2);
        const by = Math.round(cy - H / 2);
        for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (inEll(xx, yy, W, H)) put(bx + xx, by + yy, '#ffffff');
        const pw = Math.max(2, w - 1);
        const ph = Math.max(2, h - 1);
        const px0 = Math.round(cx - pw / 2 + e.look);
        const py0 = Math.round(cy - ph / 2) + 1;
        for (let yy = 0; yy < ph; yy++) for (let xx = 0; xx < pw; xx++) if (inEll(xx, yy, pw, ph)) put(px0 + xx, py0 + yy, EYE);
        put(px0 + (e.look < 0 ? 0 : pw - 1), py0, '#ffffff');
        break;
      }
      case 'glow': {
        const c = e.col ?? '#f8e040';
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (inEll(xx, yy, w, h)) put(x0 + xx, y0 + yy, c);
        if (h >= 3) put(x0 + Math.floor(w / 2) + (e.look < 0 ? -1 : 0), y0 + Math.floor(h / 2), EYE);
        break;
      }
      default: {
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (inEll(xx, yy, w, h)) put(x0 + xx, y0 + yy, EYE);
        if (h >= 3) put(x0 + (e.look > 0 ? w - 1 : 0), y0, '#ffffff');
        if (e.style === 'shine' && h >= 4) put(x0 + w - 1, y0 + h - 2, '#ffffff');
        if (e.style === 'angry') {
          // Slanted brow above the eye, pointing to the face center.
          const dir = cx < N / 2 ? 1 : -1;
          for (let xx = -1; xx <= w; xx++) {
            const yy = y0 - 1 - Math.round(((dir > 0 ? w - xx : xx + 1) / (w + 1)) * 1.5);
            put(x0 + xx, yy, EYE);
          }
        }
      }
    }
  }
  for (const m of art.mouths) {
    if (m.style === 'none') continue;
    const cx = Math.round(X(m.x) - 0.5);
    const cy = Math.round(Y(m.y));
    const w = Math.max(2, Math.min(9, Math.round(m.w * k)));
    const MC = m.col ?? '#3a1a24';
    const half = Math.floor(w / 2);
    const left = cx - half + (w % 2 === 0 ? 1 : 0);
    switch (m.style) {
      case 'flat':
        for (let xx = 0; xx < w; xx++) put(left + xx, cy, MC);
        break;
      case 'o':
        put(cx, cy, MC);
        put(cx + 1, cy, MC);
        put(cx, cy + 1, MC);
        put(cx + 1, cy + 1, MC);
        break;
      case 'cat': {
        const ww = Math.max(4, w);
        const l = cx - Math.floor(ww / 2) + 1;
        for (let xx = 0; xx < ww; xx++) put(l + xx, cy + (xx % 2 === 0 ? 0 : 1), MC);
        break;
      }
      case 'open':
      case 'tongue':
      case 'grin': {
        const ww = Math.max(3, w);
        const hh = m.style === 'grin' ? 2 : Math.max(2, Math.round(ww * 0.6));
        const l = cx - Math.floor(ww / 2) + 1;
        for (let yy = 0; yy < hh; yy++) {
          for (let xx = 0; xx < ww; xx++) {
            const corner = (yy === hh - 1 || yy === 0) && (xx === 0 || xx === ww - 1) && hh > 2;
            if (corner) continue;
            let c = MC;
            if (m.style === 'grin' && yy === 0) c = '#ffffff';
            else if (m.style !== 'grin' && yy === hh - 1 && xx > 0 && xx < ww - 1) c = '#f07890';
            put(l + xx, cy + yy, c);
          }
        }
        break;
      }
      default: {
        // smile / fang
        if (w <= 2) {
          put(cx, cy, MC);
          put(cx + 1, cy, MC);
        } else {
          put(left, cy, MC);
          put(left + w - 1, cy, MC);
          for (let xx = 1; xx < w - 1; xx++) put(left + xx, cy + 1, MC);
        }
        if (m.style === 'fang') put(left + 1, cy + 2, '#ffffff');
      }
    }
  }

  // 4) Outline around the whole silhouette.
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N && grp[y * N + x] >= 0;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      if (grp[i] >= 0) continue;
      if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) out[i] = o.outline;
    }
  }

  // 5) Sparkles (drawn outside the silhouette too).
  for (const s of art.sparkles) {
    const sx = Math.round(X(s.x));
    const sy = Math.round(Y(s.y));
    const pts = [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dy] of pts) {
      const x = sx + dx;
      const y = sy + dy;
      if (x < 0 || y < 0 || x >= N || y >= N) continue;
      const i = y * N + x;
      if (grp[i] >= 0) continue;
      out[i] = dx === 0 && dy === 0 ? '#ffffff' : s.col;
    }
  }

  const data = new Uint8ClampedArray(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    const c = out[i];
    if (!c) continue;
    const [r, g, b] = hexToRgb(c);
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { w: N, h: N, data };
}
