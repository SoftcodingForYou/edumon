// Terrain, biomes and movement rules of the world map.

import type { Habitat } from '../game/creatures';

export const T = {
  GRASS: 0,
  TALL: 1,
  PATH: 2,
  SAND: 3,
  WATER: 4,
  TREE: 5,
  PALM: 6,
  ROCK: 7,
  SNOW: 8,
  ASH: 9,
  LAVA: 10,
  CLIFF: 11,
  STAIRS: 12,
  BRIDGE: 13,
  FLOWERS: 14,
  BOULDER: 15,
  BUSH: 16,
  PILLAR: 17,
} as const;

export const B = {
  PRADERA: 0,
  BOSQUE: 1,
  LAGO: 2,
  PLAYA: 3,
  MONTANA: 4,
  CUMBRE: 5,
  VOLCAN: 6,
} as const;

export const BIOME_HABITAT: Habitat[] = ['pradera', 'bosque', 'lago', 'playa', 'montana', 'cumbre', 'volcan'];

const WALK = new Uint8Array(32);
for (const t of [T.GRASS, T.TALL, T.PATH, T.SAND, T.ROCK, T.SNOW, T.ASH, T.STAIRS, T.BRIDGE, T.FLOWERS]) WALK[t] = 1;

export const isWalkable = (t: number) => WALK[t] === 1;

export interface Spot {
  x: number;
  y: number;
  species: number;
}

export interface WorldMap {
  id: string; // identifies the generated world (seed + size) for saved games
  w: number;
  h: number;
  ter: Uint8Array;
  elev: Uint8Array;
  bio: Uint8Array;
  fresh: Uint8Array; // 1 = lake / river water
  reach: Uint8Array; // 1 = reachable walkable cell
  spots: Spot[]; // legendary creatures' homes
  starts: number[]; // cell indices where a session may start
}

/**
 * Can something step from (x0,y0) to the neighbouring cell (x1,y1)?
 * Different heights are only connected through stairs (vertically).
 */
export function canStep(m: WorldMap, x0: number, y0: number, x1: number, y1: number): boolean {
  if (x1 < 0 || y1 < 0 || x1 >= m.w || y1 >= m.h) return false;
  const a = y0 * m.w + x0;
  const b = y1 * m.w + x1;
  if (!WALK[m.ter[b]]) return false;
  const sa = m.ter[a] === T.STAIRS;
  const sb = m.ter[b] === T.STAIRS;
  if (sa || sb) {
    if (x0 === x1) return true;
    return sa && sb;
  }
  return m.elev[a] === m.elev[b];
}
