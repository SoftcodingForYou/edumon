// Building blocks shared by the world generators (Estaciones, Santiago).

import { T, canStep, isWalkable, type WorldMap } from './tiles';

export type Pt = [number, number];

/** Mark roads (2 tiles wide) along polylines. */
export function drawRoads(road: Uint8Array, W: number, H: number, roads: Pt[][]) {
  for (const pts of roads) {
    for (let s = 0; s + 1 < pts.length; s++) {
      const [ax, ay] = pts[s];
      const [bx, by] = pts[s + 1];
      const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2;
      for (let k = 0; k <= steps; k++) {
        const x = Math.round(ax + ((bx - ax) * k) / steps);
        const y = Math.round(ay + ((by - ay) * k) / steps);
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          if (x + dx >= 0 && y + dy >= 0 && x + dx < W && y + dy < H) road[(y + dy) * W + x + dx] = 1;
        }
      }
    }
  }
}

/** Roads become paths; over water they become bridges. */
export function paveRoads(ter: Uint8Array, road: Uint8Array) {
  for (let i = 0; i < ter.length; i++) {
    if (!road[i]) continue;
    if (ter[i] === T.WATER) ter[i] = T.BRIDGE;
    else if (ter[i] !== T.LAVA) ter[i] = T.PATH;
  }
}

/** Cliffs where the ground drops to the south; stairs where roads cross height changes. */
export function cliffsAndStairs(ter: Uint8Array, elev: Uint8Array, road: Uint8Array, W: number, H: number) {
  for (let y = 1; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const up = (y - 1) * W + x;
      if (ter[i] === T.WATER || ter[i] === T.LAVA || ter[i] === T.BRIDGE) continue;
      if (elev[up] > elev[i]) {
        ter[i] = road[i] && road[up] ? T.STAIRS : T.CLIFF;
      } else if (elev[up] < elev[i] && road[i] && road[up] && ter[up] !== T.STAIRS) {
        ter[i] = T.STAIRS;
      }
    }
  }
}

/** Map borders: trees on land. */
export function borderTrees(ter: Uint8Array, W: number, H: number) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x > 1 && y > 1 && x < W - 2 && y < H - 2) continue;
      const i = y * W + x;
      if (ter[i] !== T.WATER) ter[i] = T.TREE;
    }
  }
}

/**
 * Reachability from a start cell; unreachable pockets become trees / rocks / palms,
 * then the friendly starting points are collected.
 */
export function finishMap(m: WorldMap, sx: number, sy: number, isStart: (i: number) => boolean) {
  const { w: W, h: H, ter } = m;
  const N = W * H;
  const start = sy * W + sx;
  const queue = [start];
  m.reach[start] = 1;
  while (queue.length) {
    const c = queue.pop()!;
    const cx = c % W;
    const cy = (c - cx) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
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
  for (let i = 0; i < N; i++) if (ter[i] === T.PATH && m.reach[i] && isStart(i)) m.starts.push(i);
}
