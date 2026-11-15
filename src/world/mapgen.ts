// Deterministic world generation: the same seed always builds the same world,
// so children can learn where the beach, the volcanoes and the mountains are.

import { fbm, hash2 } from '../game/rng';
import { T, B, canStep, isWalkable, type WorldMap, type Spot } from './tiles';

export const MAP_W = 120;
export const MAP_H = 106;
export const WORLD_SEED = 1114;

type Pt = [number, number];

const ROADS: Pt[][] = [
  [[4, 45], [22, 45], [40, 44], [57, 44], [75, 45], [90, 44], [115, 44]], // gran camino este-oeste
  [[57, 2], [57, 44], [58, 62], [56, 80]], // camino norte-sur
  [[24, 45], [24, 26]], // subida al gran volcán
  [[92, 44], [92, 30], [99, 26], [99, 10]], // montaña y cumbre
  [[99, 26], [111, 23]], // meseta del este
  [[100, 44], [100, 52], [104, 60], [106, 67]], // santuario del bosque
  [[96, 44], [94, 60], [96, 76], [104, 82], [104, 92]], // bosque -> playa -> muelle a la isla
  [[28, 45], [28, 59]], // puente a la isla del lago
  [[8, 45], [9, 80]], // costa oeste
  [[56, 81], [82, 81], [104, 82]], // paseo de la playa
];

// Legendary homes (species id -> cell).
const SPOTS: Spot[] = [
  { species: 145, x: 113, y: 23 }, // Tronador: meseta de la montaña
  { species: 146, x: 100, y: 9 }, // Glaciela: cumbre nevada
  { species: 147, x: 24, y: 26 }, // Volcarex: cráter del gran volcán
  { species: 148, x: 110, y: 96 }, // Mareón: isla volcánica
  { species: 149, x: 106, y: 71 }, // Silvaleón: santuario del bosque
  { species: 150, x: 28, y: 61 }, // Aurorón: isla del lago
];

const BIG_VOLCANO = { x: 24, y: 22 };
const ISLAND = { x: 104, y: 96 };
const SHRINE = { x: 106, y: 71 };

let cached: WorldMap | null = null;

export function getWorldMap(): WorldMap {
  if (!cached) cached = generateWorld(WORLD_SEED);
  return cached;
}

export function generateWorld(seed: number): WorldMap {
  const W = MAP_W;
  const H = MAP_H;
  const N = W * H;
  const ter = new Uint8Array(N).fill(T.GRASS);
  const elev = new Uint8Array(N);
  const bio = new Uint8Array(N).fill(B.PRADERA);
  const fresh = new Uint8Array(N);
  const road = new Uint8Array(N);
  const idx = (x: number, y: number) => y * W + x;
  const inb = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const noise = (x: number, y: number, s: number, f: number) => fbm(x * f, y * f, seed * 31 + s, 3);
  const hv = (x: number, y: number, s: number) => hash2(x, y, seed + s * 7919);

  // 1) Sea along the south and west coasts, with sandy beaches.
  const coastY = (x: number) => 86 + 2.4 * Math.sin(x * 0.09 + 0.5) + 1.4 * Math.sin(x * 0.23 + 2) + (noise(x, 0, 1, 0.15) - 0.5) * 3;
  const coastX = (y: number) => 3 + 1.4 * Math.sin(y * 0.13) + (noise(0, y, 2, 0.15) - 0.5) * 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cy = coastY(x);
      const cx = coastX(y);
      const i = idx(x, y);
      if (y > cy || x < cx) {
        ter[i] = T.WATER;
        bio[i] = B.PLAYA;
      } else if (y > cy - (5 + 2 * noise(x, y, 3, 0.1)) || x < cx + 2.5) {
        ter[i] = T.SAND;
        bio[i] = B.PLAYA;
      }
    }
  }

  // 2) Fresh water: a lake with a little island, and a river from the mountains to the sea.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = ((x - 28) / 11) ** 2 + ((y - 60) / 7) ** 2 + (noise(x, y, 4, 0.2) - 0.5) * 0.3;
      if (d < 1) {
        const i = idx(x, y);
        ter[i] = T.WATER;
        fresh[i] = 1;
      }
    }
  }
  for (let y = 56; y <= 64; y++) {
    for (let x = 24; x <= 32; x++) {
      if ((x - 28) ** 2 + (y - 60) ** 2 < 2.4 * 2.4) {
        const i = idx(x, y);
        ter[i] = T.GRASS;
        fresh[i] = 0;
      }
    }
  }
  for (let y = 29; y < H; y++) {
    const xr = Math.round(78 - (y - 29) * 0.16 + 3 * Math.sin((y - 29) * 0.17));
    let reachedSea = false;
    for (const x of [xr, xr + 1]) {
      const i = idx(x, y);
      if (ter[i] === T.WATER && !fresh[i]) reachedSea = true;
      ter[i] = T.WATER;
      if (!reachedSea) fresh[i] = 1;
    }
    if (reachedSea) break;
  }

  // 3) The big volcano (north-west): slopes, a rim and a lava crater.
  const volcano = (vx: number, vy: number, r0: number, r1: number, r2: number, r3: number, sandR = 0) => {
    const R = Math.ceil(Math.max(r0, sandR)) + 2;
    for (let y = Math.max(0, vy - R); y < Math.min(H, vy + R); y++) {
      for (let x = Math.max(0, vx - R); x < Math.min(W, vx + R); x++) {
        const i = idx(x, y);
        const d = Math.hypot(x - vx, y - vy) * (1 + (noise(x, y, 5, 0.25) - 0.5) * 0.18);
        if (sandR && d < sandR && d >= r0) {
          ter[i] = T.SAND;
          bio[i] = B.PLAYA;
        }
        if (d >= r0) continue;
        bio[i] = B.VOLCAN;
        ter[i] = T.ASH;
        fresh[i] = 0;
        if (d < r1) elev[i] = 1;
        if (d < r2) elev[i] = 2;
        if (d < r3) ter[i] = T.LAVA;
      }
    }
  };
  volcano(BIG_VOLCANO.x, BIG_VOLCANO.y, 19, 13.5, 7, 3.3);

  // 4) Mountains (north-east): a rocky plateau with a snowy peak.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = (noise(x, y, 6, 0.2) - 0.5) * 0.25;
      const i = idx(x, y);
      if (((x - 95) / 22) ** 2 + ((y - 19) / 14) ** 2 + n < 1 && ter[i] !== T.WATER) {
        elev[i] = 1;
        ter[i] = T.ROCK;
        bio[i] = B.MONTANA;
      }
      if (((x - 100) / 10) ** 2 + ((y - 14) / 6) ** 2 + n < 1) {
        elev[i] = 2;
        ter[i] = T.SNOW;
        bio[i] = B.CUMBRE;
      }
    }
  }

  // 5) Forest (east).
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      if (ter[i] !== T.GRASS || elev[i] !== 0) continue;
      if (((x - 101) / 17) ** 2 + ((y - 63) / 17) ** 2 + (noise(x, y, 7, 0.15) - 0.5) * 0.4 < 1) bio[i] = B.BOSQUE;
    }
  }

  // 6) A small volcanic island in the south-east sea.
  volcano(ISLAND.x, ISLAND.y, 4.5, 3.5, 0, 1.5, 6.8);

  // 7) Roads (2 tiles wide). Over water they become bridges.
  for (const pts of ROADS) {
    for (let s = 0; s + 1 < pts.length; s++) {
      const [ax, ay] = pts[s];
      const [bx, by] = pts[s + 1];
      const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2;
      for (let k = 0; k <= steps; k++) {
        const x = Math.round(ax + ((bx - ax) * k) / steps);
        const y = Math.round(ay + ((by - ay) * k) / steps);
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          if (inb(x + dx, y + dy)) road[idx(x + dx, y + dy)] = 1;
        }
      }
    }
  }
  for (let i = 0; i < N; i++) {
    if (!road[i]) continue;
    if (ter[i] === T.WATER) ter[i] = T.BRIDGE;
    else if (ter[i] !== T.LAVA) ter[i] = T.PATH;
  }

  // 8) Cliffs where the ground drops to the south; stairs where roads cross height changes.
  for (let y = 1; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      const up = idx(x, y - 1);
      if (ter[i] === T.WATER || ter[i] === T.LAVA || ter[i] === T.BRIDGE) continue;
      if (elev[up] > elev[i]) {
        ter[i] = road[i] && road[up] ? T.STAIRS : T.CLIFF;
      } else if (elev[up] < elev[i] && road[i] && road[up] && ter[up] !== T.STAIRS) {
        ter[i] = T.STAIRS;
      }
    }
  }

  const nearRoad = (x: number, y: number, r: number) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (inb(x + dx, y + dy) && road[idx(x + dx, y + dy)]) return true;
    return false;
  };
  const nearTer = (x: number, y: number, r: number, types: number[]) => {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (inb(x + dx, y + dy) && types.includes(ter[idx(x + dx, y + dy)])) return true;
      }
    }
    return false;
  };
  const nearSpot = (x: number, y: number, r: number) => SPOTS.some((s) => Math.abs(s.x - x) <= r && Math.abs(s.y - y) <= r);

  // 9) Shore biome: land next to fresh water belongs to the lake habitat.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      if (bio[i] === B.PLAYA || bio[i] === B.VOLCAN || elev[i] !== 0) continue;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (inb(x + dx, y + dy) && fresh[idx(x + dx, y + dy)]) {
            near = true;
            break;
          }
        }
      }
      if (near || fresh[i]) bio[i] = B.LAGO;
    }
  }

  // 10) Plants and rocks.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      const t = ter[i];
      const b = bio[i];
      if (road[i] || nearSpot(x, y, 1)) continue;
      const nearStairs = nearTer(x, y, 1, [T.STAIRS, T.CLIFF]);
      if (t === T.GRASS) {
        if (b === B.BOSQUE) {
          const clearing = noise(x, y, 8, 0.3) > 0.62;
          if (!clearing && noise(x, y, 9, 0.18) > 0.43 && !nearRoad(x, y, 1)) ter[i] = T.TREE;
          else if (noise(x, y, 10, 0.12) > 0.5) ter[i] = T.TALL;
        } else {
          if (noise(x, y, 11, 0.13) > 0.71 && !nearRoad(x, y, 2)) ter[i] = T.TREE;
          else if (noise(x, y, 12, 0.11) > 0.6 && !nearRoad(x, y, 0)) ter[i] = T.TALL;
          else if (b === B.PRADERA && noise(x, y, 13, 0.3) > 0.64 && hv(x, y, 1) < 0.45) ter[i] = T.FLOWERS;
          else if (b === B.PRADERA && hv(x, y, 2) < 0.012 && !nearRoad(x, y, 1)) ter[i] = T.BUSH;
        }
      } else if (t === T.ROCK) {
        if (noise(x, y, 14, 0.16) > 0.63 && !nearStairs) ter[i] = T.TALL;
        else if (hv(x, y, 3) < 0.035 && !nearRoad(x, y, 1) && !nearStairs) ter[i] = T.BOULDER;
      } else if (t === T.ASH || t === T.SNOW) {
        if (hv(x, y, 4) < 0.04 && !nearRoad(x, y, 1) && !nearStairs) ter[i] = T.BOULDER;
      } else if (t === T.SAND) {
        if (hv(x, y, 5) < 0.03 && !nearRoad(x, y, 1) && !nearTer(x, y, 1, [T.WATER])) ter[i] = T.PALM;
      }
    }
  }

  // 11) The forest shrine: a round clearing with stone pillars.
  for (let y = SHRINE.y - 5; y <= SHRINE.y + 5; y++) {
    for (let x = SHRINE.x - 5; x <= SHRINE.x + 5; x++) {
      const d = Math.hypot(x - SHRINE.x, y - SHRINE.y);
      const i = idx(x, y);
      if (d < 4.2 && !road[i]) ter[i] = T.GRASS;
    }
  }
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.round(SHRINE.x + Math.cos(ang) * 3.4);
    const y = Math.round(SHRINE.y + Math.sin(ang) * 3.4);
    if (road[idx(x, y)] || nearRoad(x, y, 0)) continue;
    if (Math.sin(ang) < -0.6) continue; // keep the entrance from the north open
    ter[idx(x, y)] = T.PILLAR;
  }

  // 12) Map borders: trees on land.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x > 1 && y > 1 && x < W - 2 && y < H - 2) continue;
      const i = idx(x, y);
      if (ter[i] !== T.WATER) ter[i] = T.TREE;
    }
  }

  const m: WorldMap = { id: `v1:${seed}:${W}x${H}`, w: W, h: H, ter, elev, bio, fresh, reach: new Uint8Array(N), spots: SPOTS, starts: [] };

  // 13) Reachability from the central crossroads; unreachable pockets become trees/rocks.
  const start = idx(57, 44);
  const queue = [start];
  m.reach[start] = 1;
  while (queue.length) {
    const c = queue.pop()!;
    const cx = c % W;
    const cy = (c - cx) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!inb(nx, ny)) continue;
      const ni = idx(nx, ny);
      if (m.reach[ni] || !canStep(m, cx, cy, nx, ny)) continue;
      m.reach[ni] = 1;
      queue.push(ni);
    }
  }
  for (let i = 0; i < N; i++) {
    if (m.reach[i] || !isWalkable(ter[i])) continue;
    const t = ter[i];
    if (t === T.STAIRS || t === T.BRIDGE || t === T.PATH) continue;
    if (t === T.SAND) ter[i] = T.PALM;
    else if (t === T.ROCK || t === T.ASH || t === T.SNOW) ter[i] = T.BOULDER;
    else ter[i] = T.TREE;
  }

  // 14) Friendly starting points: roads in the lowlands.
  for (let i = 0; i < N; i++) {
    if (ter[i] === T.PATH && m.reach[i] && elev[i] === 0 && bio[i] !== B.VOLCAN) m.starts.push(i);
  }
  return m;
}
