// Draws the whole world map into one RGBA pixel buffer (16x16 px per tile).

import { hash2 } from '../game/rng';
import { ELEMS } from '../game/elements';
import { hexToRgb, type PixelImage } from '../art/raster';
import { T, B, type WorldMap } from './tiles';

export const TILE = 16;

type C = [number, number, number];
const c = (h: string): C => hexToRgb(h);

class Buf {
  constructor(
    public w: number,
    public h: number,
    public d: Uint8ClampedArray,
  ) {}
  set(x: number, y: number, col: C) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.d[i] = col[0];
    this.d[i + 1] = col[1];
    this.d[i + 2] = col[2];
    this.d[i + 3] = 255;
  }
  rect(x: number, y: number, w: number, h: number, col: C) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, col);
  }
  shade(x: number, y: number, w: number, h: number, f: number) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (xx < 0 || yy < 0 || xx >= this.w || yy >= this.h) continue;
        const i = (yy * this.w + xx) * 4;
        this.d[i] *= f;
        this.d[i + 1] *= f;
        this.d[i + 2] *= f;
      }
    }
  }
}

interface GroundPal {
  base: C;
  dark: C;
  light: C;
}

const GRASS_PAL: Record<number, GroundPal> = {
  [B.PRADERA]: { base: c('#7ccc54'), dark: c('#5aaa3e'), light: c('#a2e274') },
  [B.BOSQUE]: { base: c('#5cae4a'), dark: c('#3e8c38'), light: c('#7cc65e') },
  [B.LAGO]: { base: c('#72c85e'), dark: c('#52a646'), light: c('#98de7c') },
  [B.MONTANA]: { base: c('#86b85a'), dark: c('#689a44'), light: c('#a6d07a') },
};
const SAND_PAL: GroundPal = { base: c('#f6e2a4'), dark: c('#e2c886'), light: c('#fff4cc') };
const ROCK_PAL: GroundPal = { base: c('#cdb48e'), dark: c('#b09872'), light: c('#e0caa4') };
const SNOW_PAL: GroundPal = { base: c('#eef5ff'), dark: c('#d0dcee'), light: c('#ffffff') };
const ASH_PALS: GroundPal[] = [
  { base: c('#8c7e7c'), dark: c('#766a6a'), light: c('#a29494') },
  { base: c('#6e6070'), dark: c('#5a4e5c'), light: c('#847688') },
  { base: c('#5c4654'), dark: c('#4a3644'), light: c('#745a6a') },
];
const ASH_PAL = ASH_PALS[0];

const CLIFF_PAL: Record<number, { face: C; crack: C; top: C; shadow: C }> = {
  [B.MONTANA]: { face: c('#a87e56'), crack: c('#7e5a3a'), top: c('#c9a27a'), shadow: c('#6a4a30') },
  [B.CUMBRE]: { face: c('#a6bedc'), crack: c('#7c96b8'), top: c('#d4e4f6'), shadow: c('#64809e') },
  [B.VOLCAN]: { face: c('#3e303c'), crack: c('#261c26'), top: c('#8c7076'), shadow: c('#1a1218') },
};

const PATH_PAL: Record<number, { base: C; edge: C; dot: C }> = {
  [B.PRADERA]: { base: c('#e4c890'), edge: c('#c8a46c'), dot: c('#d2b47c') },
  [B.MONTANA]: { base: c('#dcc8a0'), edge: c('#b49a72'), dot: c('#c8b28a') },
  [B.CUMBRE]: { base: c('#dce6f2'), edge: c('#b4c4da'), dot: c('#c8d6e8') },
  [B.VOLCAN]: { base: c('#8c8090'), edge: c('#5e5464'), dot: c('#7a6e7e') },
  [B.CIUDAD]: { base: c('#c9c4ba'), edge: c('#9c968c'), dot: c('#b6b0a6') },
};

const WATER_SEA = { base: c('#4f9ef0'), wave: c('#8ccaf8'), foam: c('#e4f6ff'), foam2: c('#b4e0fa') };
const WATER_LAKE = { base: c('#56a8e6'), wave: c('#92d0f4'), foam: c('#e4f6ff'), foam2: c('#b8e2f4') };
const LAVA = { base: c('#f05a22'), mid: c('#f8a838'), hot: c('#ffe070'), crust: c('#9a2c12') };
const WOOD = { base: c('#c89458'), dark: c('#8a5a32'), light: c('#deb07a') };

const TREE = { out: c('#1e4a28'), dark: c('#2c7a38'), base: c('#3e9a48'), light: c('#66c462'), trunk: c('#8a5a32'), trunkD: c('#5e3a1e') };
const FLOWER_COLS = [c('#f05a5a'), c('#f8d84a'), c('#f8f8f8'), c('#f890c0'), c('#7aa8f8')];

function groundPalFor(m: WorldMap, i: number): GroundPal {
  const b = m.bio[i];
  if (b === B.PLAYA) return SAND_PAL;
  if (b === B.VOLCAN) return ASH_PALS[Math.min(2, m.elev[i])];
  if (b === B.CUMBRE) return SNOW_PAL;
  if (b === B.MONTANA && m.elev[i] > 0) return ROCK_PAL;
  return GRASS_PAL[b] ?? GRASS_PAL[B.PRADERA];
}

function speckle(b: Buf, x0: number, y0: number, tx: number, ty: number, pal: GroundPal, n = 3) {
  b.rect(x0, y0, TILE, TILE, pal.base);
  for (let k = 0; k < n; k++) {
    const px = x0 + 1 + Math.floor(hash2(tx, ty, 10 + k) * 13);
    const py = y0 + 2 + Math.floor(hash2(tx, ty, 20 + k) * 12);
    b.set(px, py, pal.dark);
    b.set(px + 2, py, pal.dark);
    b.set(px + 1, py + 1, pal.dark);
  }
  for (let k = 0; k < 2; k++) {
    b.set(x0 + Math.floor(hash2(tx, ty, 30 + k) * 16), y0 + Math.floor(hash2(tx, ty, 40 + k) * 16), pal.light);
  }
}

function blade(b: Buf, x: number, baseY: number, h: number, lean: number, dark: C, tip: C) {
  for (let i = 0; i < h; i++) {
    const xx = x + Math.round(lean * (i / h) * 2);
    b.set(xx, baseY - i, i === h - 1 ? tip : dark);
  }
}

function tallBlades(b: Buf, x0: number, y0: number, rows: number[]) {
  const dark = c('#2e7a2e');
  const tip = c('#94dc68');
  const mid = c('#3e9438');
  for (const row of rows) {
    const baseY = y0 + (row === 0 ? 7 : 15);
    const off = row === 0 ? 2 : 0;
    for (let k = 0; k < 4; k++) {
      const cx = x0 + off + k * 4;
      blade(b, cx, baseY, 5, -1, dark, tip);
      blade(b, cx + 1, baseY, 7, 0, mid, tip);
      blade(b, cx + 2, baseY, 5, 1, dark, tip);
    }
  }
}

export function tallGrassFront(): PixelImage {
  const data = new Uint8ClampedArray(TILE * TILE * 4);
  const b = new Buf(TILE, TILE, data);
  tallBlades(b, 0, 0, [1]);
  // keep only the lower part so the creature's head stays visible
  for (let y = 0; y < 9; y++) for (let x = 0; x < TILE; x++) data[(y * TILE + x) * 4 + 3] = 0;
  return { w: TILE, h: TILE, data };
}

function waterTile(b: Buf, m: WorldMap, x0: number, y0: number, tx: number, ty: number) {
  const i = ty * m.w + tx;
  const pal = m.fresh[i] ? WATER_LAKE : WATER_SEA;
  b.rect(x0, y0, TILE, TILE, pal.base);
  for (let k = 0; k < 2; k++) {
    const wx = x0 + 1 + Math.floor(hash2(tx, ty, 50 + k) * 11);
    const wy = y0 + 2 + Math.floor(hash2(tx, ty, 60 + k) * 12);
    b.rect(wx, wy, 3, 1, pal.wave);
  }
  const isW = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
    const t = m.ter[y * m.w + x];
    return t === T.WATER || t === T.BRIDGE;
  };
  if (!isW(tx, ty - 1)) {
    b.rect(x0, y0, TILE, 2, pal.foam);
    b.rect(x0, y0 + 2, TILE, 1, pal.foam2);
  }
  if (!isW(tx, ty + 1)) {
    b.rect(x0, y0 + 14, TILE, 2, pal.foam);
    b.rect(x0, y0 + 13, TILE, 1, pal.foam2);
  }
  if (!isW(tx - 1, ty)) {
    b.rect(x0, y0, 2, TILE, pal.foam);
    b.rect(x0 + 2, y0, 1, TILE, pal.foam2);
  }
  if (!isW(tx + 1, ty)) {
    b.rect(x0 + 14, y0, 2, TILE, pal.foam);
    b.rect(x0 + 13, y0, 1, TILE, pal.foam2);
  }
}

function lavaTile(b: Buf, m: WorldMap, x0: number, y0: number, tx: number, ty: number) {
  b.rect(x0, y0, TILE, TILE, LAVA.base);
  for (let k = 0; k < 3; k++) {
    const lx = x0 + 2 + Math.floor(hash2(tx, ty, 70 + k) * 11);
    const ly = y0 + 2 + Math.floor(hash2(tx, ty, 80 + k) * 11);
    b.rect(lx, ly, 3, 2, LAVA.mid);
    b.set(lx + 1, ly, LAVA.hot);
  }
  const isL = (x: number, y: number) => m.ter[y * m.w + x] === T.LAVA;
  if (!isL(tx, ty - 1)) b.rect(x0, y0, TILE, 2, LAVA.crust);
  if (!isL(tx, ty + 1)) b.rect(x0, y0 + 14, TILE, 2, LAVA.crust);
  if (!isL(tx - 1, ty)) b.rect(x0, y0, 2, TILE, LAVA.crust);
  if (!isL(tx + 1, ty)) b.rect(x0 + 14, y0, 2, TILE, LAVA.crust);
}

function treeTile(b: Buf, x0: number, y0: number) {
  for (let y = 0; y < 14; y++) {
    for (let x = 0; x < TILE; x++) {
      const dx = x - 7.5;
      const dy = y - 6.5;
      const d = Math.hypot(dx, dy);
      if (d > 7.4) continue;
      let col = TREE.base;
      if (d > 6.5) col = TREE.out;
      else if (dx + dy > 3.5) col = TREE.dark;
      else if (dx + dy < -5 && d < 5.5) col = TREE.light;
      b.set(x0 + x, y0 + y, col);
    }
  }
  // leafy texture
  for (const [x, y] of [[4, 4], [9, 3], [6, 8], [11, 7], [3, 9]]) b.set(x0 + x, y0 + y, TREE.dark);
  b.rect(x0 + 6, y0 + 12, 4, 4, TREE.trunk);
  b.rect(x0 + 8, y0 + 12, 2, 4, TREE.trunkD);
  b.set(x0 + 5, y0 + 15, TREE.out);
  b.set(x0 + 10, y0 + 15, TREE.out);
}

function palmTile(b: Buf, x0: number, y0: number) {
  const trunk = c('#a8784a');
  const trunkD = c('#7a522e');
  for (let y = 5; y < 16; y++) {
    const x = 8 + Math.round(Math.sin(y * 0.35) * 1.2);
    b.set(x0 + x, y0 + y, trunk);
    b.set(x0 + x + 1, y0 + y, y % 3 === 0 ? trunkD : trunk);
  }
  const leaf = c('#4cb848');
  const leafD = c('#2c7a34');
  const fronds: [number, number][] = [[1, 7], [3, 2], [9, 0], [15, 3], [15, 8]];
  for (const [fx, fy] of fronds) {
    const steps = 9;
    for (let k = 0; k <= steps; k++) {
      const x = Math.round(9 + ((fx - 9) * k) / steps);
      const y = Math.round(5 + ((fy - 5) * k) / steps + Math.sin((k / steps) * Math.PI) * (fy > 5 ? 0 : -1));
      b.set(x0 + x, y0 + y, leaf);
      b.set(x0 + x, y0 + y + 1, leafD);
    }
  }
  b.rect(x0 + 8, y0 + 4, 3, 3, c('#7a522e'));
}

function boulderTile(b: Buf, x0: number, y0: number, bio: number) {
  const pal =
    bio === B.VOLCAN
      ? { out: c('#221a26'), dark: c('#3a3240'), base: c('#544a5a'), light: c('#7a6e80') }
      : bio === B.CUMBRE
        ? { out: c('#3e4a5e'), dark: c('#7a88a0'), base: c('#a2b0c4'), light: c('#ffffff') }
        : { out: c('#3e3a48'), dark: c('#6e6a78'), base: c('#9a96a2'), light: c('#c4c0ca') };
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const dx = (x - 7.5) / 7;
      const dy = (y - 9) / 6;
      const d = Math.hypot(dx, dy);
      if (d > 1.05) continue;
      let col = pal.base;
      if (d > 0.88) col = pal.out;
      else if (dx + dy > 0.6) col = pal.dark;
      else if (dx + dy < -0.7) col = pal.light;
      b.set(x0 + x, y0 + y, col);
    }
  }
}

function bushTile(b: Buf, x0: number, y0: number) {
  const out = c('#1e4a28');
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const dx = (x - 7.5) / 7;
      const dy = (y - 9.5) / 5.5;
      const d = Math.hypot(dx, dy);
      if (d > 1.05) continue;
      let col = c('#4aa848');
      if (d > 0.85) col = out;
      else if (dx + dy > 0.5) col = c('#2e8038');
      else if (dx + dy < -0.6) col = c('#76cc62');
      b.set(x0 + x, y0 + y, col);
    }
  }
  b.set(x0 + 5, y0 + 8, c('#f05a5a'));
  b.set(x0 + 10, y0 + 10, c('#f05a5a'));
}

function pillarTile(b: Buf, x0: number, y0: number) {
  const out = c('#3a3a48');
  b.rect(x0 + 4, y0 + 1, 8, 15, out);
  b.rect(x0 + 5, y0 + 2, 6, 13, c('#c8c8d6'));
  b.rect(x0 + 9, y0 + 2, 2, 13, c('#9a9aae'));
  b.rect(x0 + 5, y0 + 2, 6, 2, c('#e4e4f0'));
  b.rect(x0 + 5, y0 + 2, 3, 1, c('#5cae4a'));
  b.rect(x0 + 6, y0 + 7, 4, 1, c('#9a9aae'));
  b.rect(x0 + 3, y0 + 14, 10, 2, out);
}

// ------------------------------------------------------------ city tiles (Santiago)

const mix = (a: C, b2: C, k: number): C => [a[0] + (b2[0] - a[0]) * k, a[1] + (b2[1] - a[1]) * k, a[2] + (b2[2] - a[2]) * k].map(Math.round) as C;
const INK = c('#2a2238');
const WALL = { base: c('#f2e8d2'), shade: c('#d8cab0') };
const GLASS = { base: c('#86bce8'), shine: c('#d8f0ff'), lit: c('#ffe27a'), frame: c('#5a6478') };
const roofCache = new Map<string, { base: C; dark: C; light: C }>();

/** Roofs take the colour of the district's type, so every district looks different. */
function roofPal(m: WorldMap, i: number) {
  const type = m.zones[m.zone[i]]?.type;
  const hex = type ? ELEMS[type].color : '#c0603c';
  let pal = roofCache.get(hex);
  if (!pal) {
    const base = mix(c(hex), c('#9a8c84'), 0.2);
    pal = { base, dark: mix(base, INK, 0.35), light: mix(base, c('#ffffff'), 0.35) };
    roofCache.set(hex, pal);
  }
  return pal;
}

function buildingTile(b: Buf, m: WorldMap, x0: number, y0: number, tx: number, ty: number) {
  const i = ty * m.w + tx;
  const isB = (x: number, y: number) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.ter[y * m.w + x] === T.BUILDING;
  const roof = roofPal(m, i);
  if (isB(tx, ty + 1)) {
    // roof seen from above, with tiles and a lighter ridge at the top edge
    b.rect(x0, y0, TILE, TILE, roof.base);
    for (let y = 3; y < TILE; y += 4) b.rect(x0, y0 + y, TILE, 1, roof.dark);
    if (!isB(tx, ty - 1)) {
      b.rect(x0, y0, TILE, 1, INK);
      b.rect(x0, y0 + 1, TILE, 2, roof.light);
    }
  } else {
    // front wall with two windows (some lit) and sometimes a door
    b.rect(x0, y0, TILE, TILE, WALL.base);
    b.rect(x0, y0, TILE, 3, roof.dark);
    if (!isB(tx, ty - 1)) b.rect(x0, y0, TILE, 1, INK);
    const door = hash2(tx, ty, 170) < 0.3;
    for (const wx of door ? [1, 11] : [2, 10]) {
      b.rect(x0 + wx, y0 + 5, 5, 5, GLASS.frame);
      b.rect(x0 + wx + 1, y0 + 6, 3, 3, hash2(tx * 3 + wx, ty, 171) < 0.2 ? GLASS.lit : GLASS.base);
      b.set(x0 + wx + 1, y0 + 6, GLASS.shine);
    }
    if (door) {
      b.rect(x0 + 6, y0 + 8, 4, 7, c('#8a5a32'));
      b.set(x0 + 8, y0 + 11, c('#f8d84a'));
    }
    b.rect(x0, y0 + 13, TILE, 2, WALL.shade);
    b.rect(x0, y0 + 15, TILE, 1, INK);
  }
  if (!isB(tx - 1, ty)) b.rect(x0, y0, 1, TILE, INK);
  if (!isB(tx + 1, ty)) b.rect(x0 + 15, y0, 1, TILE, INK);
}

function tombTile(b: Buf, x0: number, y0: number) {
  const stone = c('#b4b4c4');
  const dark = c('#7c7c90');
  b.rect(x0 + 4, y0 + 13, 9, 2, c('#3e8c38')); // shadow on the grass
  for (let y = 3; y < 14; y++) {
    for (let x = 4; x < 12; x++) {
      const top = y < 6 && Math.hypot(x - 7.5, y - 6) > 3.6; // rounded top
      if (top) continue;
      const edge = x === 4 || x === 11 || y === 13 || (y < 7 && Math.hypot(x - 7.5, y - 6) > 2.9);
      b.set(x0 + x, y0 + y, edge ? INK : x > 9 ? dark : stone);
    }
  }
  b.rect(x0 + 6, y0 + 8, 4, 1, dark);
  b.rect(x0 + 6, y0 + 10, 4, 1, dark);
}

function railTile(b: Buf, x0: number, y0: number, tx: number, ty: number) {
  speckle(b, x0, y0, tx, ty, { base: c('#a8998a'), dark: c('#867868'), light: c('#c4b8aa') }, 4);
  for (let x = 1; x < TILE; x += 4) b.rect(x0 + x, y0 + 2, 2, 12, c('#7a5232'));
  for (const ry of [4, 10]) {
    b.rect(x0, y0 + ry, TILE, 1, c('#e4e8ee'));
    b.rect(x0, y0 + ry + 1, TILE, 1, c('#6a6e7a'));
  }
}

function flowersTile(b: Buf, x0: number, y0: number, tx: number, ty: number) {
  for (let k = 0; k < 3; k++) {
    const fx = x0 + 2 + Math.floor(hash2(tx, ty, 90 + k) * 11);
    const fy = y0 + 2 + Math.floor(hash2(tx, ty, 95 + k) * 11);
    const col = FLOWER_COLS[Math.floor(hash2(tx, ty, 99 + k) * FLOWER_COLS.length)];
    b.set(fx - 1, fy, col);
    b.set(fx + 1, fy, col);
    b.set(fx, fy - 1, col);
    b.set(fx, fy + 1, col);
    b.set(fx, fy, c('#f8e070'));
  }
}

function pathTile(b: Buf, m: WorldMap, x0: number, y0: number, tx: number, ty: number) {
  const i = ty * m.w + tx;
  const bio = m.bio[i];
  if (bio === B.PLAYA) {
    // wooden boardwalk on the beach
    b.rect(x0, y0, TILE, TILE, WOOD.base);
    for (let y = 3; y < TILE; y += 4) b.rect(x0, y0 + y, TILE, 1, WOOD.dark);
    for (let y = 0; y < TILE; y += 4) b.rect(x0, y0 + y, TILE, 1, WOOD.light);
    return;
  }
  const key =
    bio === B.VOLCAN ? B.VOLCAN : bio === B.CUMBRE ? B.CUMBRE : bio === B.MONTANA && m.elev[i] > 0 ? B.MONTANA : bio === B.CIUDAD ? B.CIUDAD : B.PRADERA;
  const pal = PATH_PAL[key];
  b.rect(x0, y0, TILE, TILE, pal.base);
  for (let k = 0; k < 3; k++) {
    b.set(x0 + 1 + Math.floor(hash2(tx, ty, 110 + k) * 14), y0 + 1 + Math.floor(hash2(tx, ty, 120 + k) * 14), pal.dot);
  }
  const isP = (x: number, y: number) => {
    const t = m.ter[y * m.w + x];
    return t === T.PATH || t === T.STAIRS || t === T.BRIDGE;
  };
  if (!isP(tx, ty - 1)) b.rect(x0, y0, TILE, 1, pal.edge);
  if (!isP(tx, ty + 1)) b.rect(x0, y0 + 15, TILE, 1, pal.edge);
  if (!isP(tx - 1, ty)) b.rect(x0, y0, 1, TILE, pal.edge);
  if (!isP(tx + 1, ty)) b.rect(x0 + 15, y0, 1, TILE, pal.edge);
}

function cliffPalFor(bio: number) {
  return CLIFF_PAL[bio] ?? CLIFF_PAL[B.MONTANA];
}

function cliffTile(b: Buf, m: WorldMap, x0: number, y0: number, tx: number, ty: number) {
  const above = (ty - 1) * m.w + tx;
  const pal = cliffPalFor(m.bio[above]);
  b.rect(x0, y0, TILE, TILE, pal.face);
  for (let k = 0; k < 3; k++) {
    const cx = x0 + 2 + Math.floor(hash2(tx, ty, 130 + k) * 12);
    const len = 5 + Math.floor(hash2(tx, ty, 140 + k) * 8);
    const cy = y0 + 3 + Math.floor(hash2(tx, ty, 150 + k) * (13 - len + 3));
    b.rect(cx, cy, 1, len, pal.crack);
  }
  b.rect(x0, y0, TILE, 2, pal.top);
  b.rect(x0, y0 + 2, TILE, 1, pal.crack);
  b.rect(x0, y0 + 15, TILE, 1, pal.shadow);
  const isC = (x: number) => {
    const t = m.ter[ty * m.w + x];
    return t === T.CLIFF || t === T.STAIRS;
  };
  if (!isC(tx - 1)) b.rect(x0, y0, 2, TILE, pal.shadow);
  if (!isC(tx + 1)) b.rect(x0 + 14, y0, 2, TILE, pal.shadow);
}

function stairsTile(b: Buf, m: WorldMap, x0: number, y0: number, tx: number, ty: number) {
  const i = ty * m.w + tx;
  const above = Math.max(0, ty - 1) * m.w + tx;
  const bio = m.elev[above] > m.elev[i] ? m.bio[above] : m.bio[i];
  const pal = cliffPalFor(bio === B.PRADERA || bio === B.BOSQUE || bio === B.LAGO || bio === B.PLAYA ? B.MONTANA : bio);
  b.rect(x0, y0, TILE, TILE, pal.top);
  for (let y = 0; y < TILE; y += 4) {
    b.rect(x0, y0 + y, TILE, 1, c('#ffffff'));
    b.shade(x0, y0 + y, TILE, 1, 0.92);
    b.rect(x0, y0 + y + 3, TILE, 1, pal.crack);
  }
  const isS = (x: number) => m.ter[ty * m.w + x] === T.STAIRS;
  if (!isS(tx - 1)) b.rect(x0, y0, 2, TILE, pal.shadow);
  if (!isS(tx + 1)) b.rect(x0 + 14, y0, 2, TILE, pal.shadow);
}

function bridgeTile(b: Buf, m: WorldMap, x0: number, y0: number, tx: number, ty: number) {
  const isWater = (x: number, y: number) => {
    const t = m.ter[y * m.w + x];
    return t === T.WATER;
  };
  const vertical = isWater(tx - 1, ty) || isWater(tx + 1, ty);
  b.rect(x0, y0, TILE, TILE, WOOD.base);
  if (vertical) {
    for (let y = 3; y < TILE; y += 4) b.rect(x0, y0 + y, TILE, 1, WOOD.dark);
    for (let y = 0; y < TILE; y += 4) b.rect(x0, y0 + y, TILE, 1, WOOD.light);
    const rail = (x: number) => b.rect(x0 + x, y0, 2, TILE, WOOD.dark);
    if (m.ter[ty * m.w + tx - 1] !== T.BRIDGE) rail(0);
    if (m.ter[ty * m.w + tx + 1] !== T.BRIDGE) rail(14);
  } else {
    for (let x = 3; x < TILE; x += 4) b.rect(x0 + x, y0, 1, TILE, WOOD.dark);
    for (let x = 0; x < TILE; x += 4) b.rect(x0 + x, y0, 1, TILE, WOOD.light);
    if (m.ter[(ty - 1) * m.w + tx] !== T.BRIDGE) b.rect(x0, y0, TILE, 2, WOOD.dark);
    if (m.ter[(ty + 1) * m.w + tx] !== T.BRIDGE) b.rect(x0, y0 + 14, TILE, 2, WOOD.dark);
  }
}

function drawTile(b: Buf, m: WorldMap, tx: number, ty: number) {
  const i = ty * m.w + tx;
  const t = m.ter[i];
  const x0 = tx * TILE;
  const y0 = ty * TILE;
  const gp = groundPalFor(m, i);
  switch (t) {
    case T.WATER:
      waterTile(b, m, x0, y0, tx, ty);
      break;
    case T.LAVA:
      lavaTile(b, m, x0, y0, tx, ty);
      break;
    case T.PATH:
      pathTile(b, m, x0, y0, tx, ty);
      break;
    case T.CLIFF:
      cliffTile(b, m, x0, y0, tx, ty);
      break;
    case T.STAIRS:
      stairsTile(b, m, x0, y0, tx, ty);
      break;
    case T.BRIDGE:
      bridgeTile(b, m, x0, y0, tx, ty);
      break;
    case T.SAND:
      speckle(b, x0, y0, tx, ty, SAND_PAL, 2);
      break;
    case T.ROCK:
      speckle(b, x0, y0, tx, ty, ROCK_PAL, 3);
      break;
    case T.SNOW:
      speckle(b, x0, y0, tx, ty, SNOW_PAL, 2);
      break;
    case T.ASH:
      speckle(b, x0, y0, tx, ty, gp, 3);
      if (hash2(tx, ty, 160) < 0.06 + m.elev[i] * 0.06) b.set(x0 + 5 + Math.floor(hash2(tx, ty, 161) * 6), y0 + 6, c('#f07a3a'));
      break;
    case T.TALL: {
      const base = gp === ROCK_PAL ? GRASS_PAL[B.MONTANA] : gp;
      b.rect(x0, y0, TILE, TILE, base.dark);
      tallBlades(b, x0, y0, [0, 1]);
      break;
    }
    case T.FLOWERS:
      speckle(b, x0, y0, tx, ty, gp, 1);
      flowersTile(b, x0, y0, tx, ty);
      break;
    case T.TREE:
      speckle(b, x0, y0, tx, ty, gp === SAND_PAL || ASH_PALS.includes(gp) || gp === SNOW_PAL || gp === ROCK_PAL ? GRASS_PAL[B.BOSQUE] : gp, 1);
      treeTile(b, x0, y0);
      break;
    case T.PALM:
      speckle(b, x0, y0, tx, ty, SAND_PAL, 1);
      palmTile(b, x0, y0);
      break;
    case T.BOULDER:
      speckle(b, x0, y0, tx, ty, gp, 1);
      boulderTile(b, x0, y0, m.bio[i]);
      break;
    case T.BUSH:
      speckle(b, x0, y0, tx, ty, gp, 1);
      bushTile(b, x0, y0);
      break;
    case T.PILLAR:
      speckle(b, x0, y0, tx, ty, gp, 1);
      pillarTile(b, x0, y0);
      break;
    case T.BUILDING:
      buildingTile(b, m, x0, y0, tx, ty);
      break;
    case T.TOMB:
      speckle(b, x0, y0, tx, ty, gp, 1);
      tombTile(b, x0, y0);
      break;
    case T.RAIL:
      railTile(b, x0, y0, tx, ty);
      break;
    default:
      speckle(b, x0, y0, tx, ty, gp, 3);
  }

  // Edges of raised ground (plateaus, volcano slopes).
  const e = m.elev[i];
  if (e > 0 && t !== T.CLIFF && t !== T.STAIRS) {
    const pal = cliffPalFor(m.bio[i]);
    const lower = (x: number, y: number) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.elev[y * m.w + x] < e && m.ter[y * m.w + x] !== T.STAIRS;
    if (lower(tx - 1, ty)) {
      b.rect(x0, y0, 2, TILE, pal.shadow);
      b.rect(x0 + 2, y0, 1, TILE, pal.crack);
    }
    if (lower(tx + 1, ty)) {
      b.rect(x0 + 14, y0, 2, TILE, pal.shadow);
      b.rect(x0 + 13, y0, 1, TILE, pal.crack);
    }
    if (lower(tx, ty - 1)) {
      b.rect(x0, y0, TILE, 1, pal.crack);
      b.rect(x0, y0 + 1, TILE, 1, pal.top);
    }
  }
  // Soft shadow at the foot of cliffs.
  if (ty > 0 && m.ter[(ty - 1) * m.w + tx] === T.CLIFF && t !== T.CLIFF && t !== T.WATER) b.shade(x0, y0, TILE, 3, 0.8);
}

/** Render the static map image (RGBA) for the whole world. */
export function renderMapPixels(m: WorldMap): PixelImage {
  const w = m.w * TILE;
  const h = m.h * TILE;
  const data = new Uint8ClampedArray(w * h * 4);
  const b = new Buf(w, h, data);
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) drawTile(b, m, tx, ty);
  return { w, h, data };
}

/** One pixel per tile overview (used for debugging / previews). */
export function minimapPixels(m: WorldMap): PixelImage {
  const data = new Uint8ClampedArray(m.w * m.h * 4);
  const colors: Record<number, string> = {
    [T.GRASS]: '#7ccc54',
    [T.TALL]: '#2e7a2e',
    [T.PATH]: '#e4c890',
    [T.SAND]: '#f6e2a4',
    [T.WATER]: '#4f9ef0',
    [T.TREE]: '#1e5a28',
    [T.PALM]: '#4cb848',
    [T.ROCK]: '#cdb48e',
    [T.SNOW]: '#ffffff',
    [T.ASH]: '#6e6474',
    [T.LAVA]: '#f05a22',
    [T.CLIFF]: '#6a4a30',
    [T.STAIRS]: '#ff00ff',
    [T.BRIDGE]: '#c89458',
    [T.FLOWERS]: '#f890c0',
    [T.BOULDER]: '#3e3a48',
    [T.BUSH]: '#2e8038',
    [T.PILLAR]: '#c8c8d6',
    [T.BUILDING]: '#c0603c',
    [T.TOMB]: '#b4b4c4',
    [T.RAIL]: '#867868',
  };
  for (let i = 0; i < m.w * m.h; i++) {
    const [r, g, bb] = hexToRgb(colors[m.ter[i]] ?? '#000000');
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = bb;
    data[i * 4 + 3] = 255;
  }
  return { w: m.w, h: m.h, data };
}
