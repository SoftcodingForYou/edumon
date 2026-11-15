// Terrain, biomes, zones and movement rules of the world maps.

import type { Habitat } from '../game/creatures';
import type { Elem } from '../game/elements';

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
  BUILDING: 18, // city buildings (roof tinted with the district's type colour)
  TOMB: 19, // gravestones in the cemetery
  RAIL: 20, // railway tracks
} as const;

export const B = {
  PRADERA: 0,
  BOSQUE: 1,
  LAGO: 2,
  PLAYA: 3,
  MONTANA: 4,
  CUMBRE: 5,
  VOLCAN: 6,
  CIUDAD: 7, // streets and squares (only a look: creatures follow the zones)
} as const;

/** The creature habitat of each natural biome (Estaciones zones use the same order). */
export const BIOME_HABITAT: Habitat[] = ['pradera', 'bosque', 'lago', 'playa', 'montana', 'cumbre', 'volcan'];

/** Battle background of each biome (CSS class "bg-<name>"). */
export const BIOME_BG: string[] = [...BIOME_HABITAT, 'ciudad'];

export type MapId = 'estaciones' | 'santiago';
export const MAP_IDS: MapId[] = ['estaciones', 'santiago'];
export const MAP_NAMES: Record<MapId, string> = { estaciones: 'Estaciones', santiago: 'Santiago' };

/**
 * A region of the map that decides which wild creatures live there: by habitat
 * (Estaciones: pradera, bosque...) or by type (Santiago: one type per district).
 */
export interface Zone {
  name: string; // "la pradera", "Recoleta"...
  habitats?: Habitat[];
  type?: Elem;
}

/** A name written on the world map (in tiles). */
export interface MapLabel {
  name: string;
  x: number;
  y: number;
  type?: Elem;
}

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
  key: MapId;
  name: string;
  w: number;
  h: number;
  ter: Uint8Array;
  elev: Uint8Array;
  bio: Uint8Array; // look of the ground (B.*) and the battle background
  zone: Uint8Array; // index into zones: who lives there
  zones: Zone[];
  labels: MapLabel[];
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
