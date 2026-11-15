// The "Santiago" world: an abstract map of Santiago de Chile. Each district (comuna) is a
// zone where the creatures of one type live, chosen for what the place is known for.
// Deterministic like Estaciones: saved games point into this exact world.

import { fbm, hash2 } from '../game/rng';
import type { Elem } from '../game/elements';
import { T, B, type WorldMap, type Spot, type Zone, type MapLabel } from './tiles';
import { borderTrees, cliffsAndStairs, drawRoads, finishMap, paveRoads, type Pt } from './mapkit';

export const SANTIAGO_W = 120;
export const SANTIAGO_H = 106;
export const SANTIAGO_SEED = 1541; // founding year of the city

interface District {
  name: string;
  type: Elem;
  x: number; // centre of the district (tiles)
  y: number;
  w: number; // relative size
  city: number; // share of city blocks with buildings (the rest are parks / fields)
}

// One district per type. The order is the zone index stored in the map: keep it stable.
const DISTRICTS: District[] = [
  { name: 'Santiago Centro', type: 'normal', x: 56, y: 47, w: 0.95, city: 0.8 }, // the historic centre
  { name: 'Recoleta', type: 'fantasma', x: 46, y: 17, w: 1, city: 0.55 }, // Cementerio General
  { name: 'Providencia', type: 'magia', x: 70, y: 30, w: 0.95, city: 0.55 }, // Bellavista, Cerro San Cristóbal
  { name: 'Vitacura', type: 'agua', x: 86, y: 22, w: 0.9, city: 0.4 }, // Parque Bicentenario lagoons
  { name: 'Lo Barnechea', type: 'hielo', x: 108, y: 14, w: 1.05, city: 0.35 }, // Farellones snow
  { name: 'Ñuñoa', type: 'lucha', x: 80, y: 53, w: 0.95, city: 0.6 }, // Estadio Nacional
  { name: 'La Florida', type: 'planta', x: 88, y: 74, w: 1, city: 0.25 }, // "the flowery": parks, foothill forest
  { name: 'Cajón del Maipo', type: 'fuego', x: 109, y: 90, w: 0.95, city: 0 }, // Volcán San José
  { name: 'Puente Alto', type: 'roca', x: 74, y: 93, w: 0.95, city: 0.35 }, // gravel pits by the Maipo
  { name: 'La Pintana', type: 'bicho', x: 46, y: 86, w: 1, city: 0.12 }, // farmland and orchards
  { name: 'Estación Central', type: 'electrico', x: 24, y: 64, w: 1.05, city: 0.6 }, // railway station
  { name: 'Quinta Normal', type: 'dragon', x: 32, y: 42, w: 0.85, city: 0.5 }, // natural history museum
  { name: 'Pudahuel', type: 'aire', x: 12, y: 28, w: 1, city: 0.12 }, // the airport
];
const Z = Object.fromEntries(DISTRICTS.map((d, k) => [d.type, k])) as Record<Elem, number>;

// Legendary homes (species id -> cell).
const SPOTS: Spot[] = [
  { species: 145, x: 40, y: 64 }, // Tronador: the railway station platform
  { species: 146, x: 108, y: 8 }, // Glaciela: the snowy summit above Farellones
  { species: 147, x: 108, y: 82 }, // Volcarex: the crater of Volcán San José
  { species: 148, x: 84, y: 20 }, // Mareón: the island in Parque Bicentenario's lagoon
  { species: 149, x: 64, y: 25 }, // Silvaleón: the top of Cerro San Cristóbal
  { species: 150, x: 32, y: 47 }, // Aurorón: in front of the natural history museum
];

// Rivers: the Mapocho crosses the city from the Andes to the west; the Maipo runs along the south.
const MAPOCHO: Pt[] = [[119, 37], [106, 34], [94, 32], [82, 36], [68, 39], [56, 40], [46, 36], [36, 33], [24, 35], [12, 39], [0, 42]];
const MAIPO: Pt[] = [[97, 105], [88, 101], [70, 102], [52, 100], [34, 101], [16, 98], [0, 96]];

const VESPUCIO: Pt[] = (() => {
  // The ring road around the city (Américo Vespucio).
  const pts: Pt[] = [];
  for (let k = 0; k <= 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    pts.push([Math.round(56 + 41 * Math.cos(a)), Math.round(54 + 37 * Math.sin(a))]);
  }
  return pts;
})();

const ROADS: Pt[][] = [
  [[3, 50], [100, 50]], // Alameda, east-west through the centre
  [[50, 3], [50, 100]], // the great north-south avenue
  VESPUCIO,
  [[97, 50], [104, 44], [104, 21], [108, 18], [108, 8]], // up to Farellones (stairs)
  [[66, 50], [66, 37], [64, 36], [64, 27]], // up Cerro San Cristóbal (bridge + stairs)
  [[61, 50], [61, 45]], // Cerro Santa Lucía
  [[84, 31], [84, 22]], // bridge to the lagoon island
  [[96, 62], [108, 62], [108, 82]], // up the volcano (stairs)
  [[6, 22], [34, 22]], // the airport runway
  [[32, 50], [32, 46]], // to the museum
  [[40, 50], [40, 63]], // to the station
];

const HILLS = [
  { x: 64, y: 27, r: 6, zone: Z.magia }, // Cerro San Cristóbal (forest)
  { x: 61, y: 45, r: 3, zone: Z.normal }, // Cerro Santa Lucía
];
const MOUNTAIN = { x: 109, y: 12, rx: 15, ry: 15 };
const PEAK = { x: 109, y: 8, rx: 8, ry: 6 };
const VOLCANO = { x: 108, y: 87, r0: 12, r1: 9, r2: 5, r3: 2.4 };
const LAGOON = { x: 84, y: 20, rx: 5.5, ry: 4, island: 2.2 };
const CEMETERY = { x0: 35, y0: 3, x1: 47, y1: 15 };
const STADIUM = { x: 80, y: 57, rx: 7, ry: 4.6 };
const MUSEUM = { x0: 27, y0: 41, x1: 37, y1: 44 }; // the building; pillars and courtyard in front
const STATION = { x0: 34, y0: 58, x1: 45, y1: 61 }; // the building; platform below it
const RAIL_Y = 64; // two tracks: RAIL_Y and RAIL_Y + 1

// Where the district names are written on the world map (clear of the legendary stars).
const LABEL_AT: Partial<Record<Elem, [number, number]>> = {
  normal: [54, 55],
  fantasma: [46, 19],
  magia: [73, 33],
  agua: [84, 28],
  hielo: [108, 39],
  lucha: [80, 49],
  planta: [88, 71],
  fuego: [107, 99],
  roca: [74, 91],
  bicho: [44, 86],
  electrico: [20, 58],
  dragon: [31, 37],
  aire: [14, 31],
};
const LABELS: MapLabel[] = DISTRICTS.map((d) => {
  const [x, y] = LABEL_AT[d.type] ?? [d.x, d.y];
  return { name: d.name, x, y, type: d.type };
});

export function generateSantiago(seed: number = SANTIAGO_SEED): WorldMap {
  const W = SANTIAGO_W;
  const H = SANTIAGO_H;
  const N = W * H;
  const ter = new Uint8Array(N).fill(T.GRASS);
  const elev = new Uint8Array(N);
  const bio = new Uint8Array(N).fill(B.CIUDAD);
  const zone = new Uint8Array(N);
  const fresh = new Uint8Array(N);
  const road = new Uint8Array(N);
  const fixed = new Uint8Array(N); // set by a landmark: the city fill leaves it alone
  const idx = (x: number, y: number) => y * W + x;
  const inb = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const noise = (x: number, y: number, s: number, f: number) => fbm(x * f, y * f, seed * 31 + s, 3);
  const hv = (x: number, y: number, s: number) => hash2(x, y, seed + s * 7919);
  const ell = (x: number, y: number, e: { x: number; y: number; rx: number; ry: number }) => ((x - e.x) / e.rx) ** 2 + ((y - e.y) / e.ry) ** 2;

  // 1) Districts: the nearest district centre wins, with wobbly borders.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const jx = x + (noise(x, y, 1, 0.09) - 0.5) * 9;
      const jy = y + (noise(x, y, 2, 0.09) - 0.5) * 9;
      let best = 0;
      let bestD = Infinity;
      DISTRICTS.forEach((d, k) => {
        const dd = Math.hypot(jx - d.x, jy - d.y) / d.w;
        if (dd < bestD) {
          bestD = dd;
          best = k;
        }
      });
      zone[idx(x, y)] = best;
    }
  }

  // 2) The Andes in the north-east: a rocky plateau with snowy Farellones on top.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      const n = (noise(x, y, 3, 0.2) - 0.5) * 0.25;
      if (ell(x, y, MOUNTAIN) + n < 1) {
        elev[i] = 1;
        ter[i] = T.ROCK;
        bio[i] = B.MONTANA;
        zone[i] = Z.hielo;
        fixed[i] = 1;
      }
      if (ell(x, y, PEAK) + n < 1) {
        elev[i] = 2;
        ter[i] = T.SNOW;
        bio[i] = B.CUMBRE;
      }
    }
  }

  // 3) Volcán San José at the end of the Cajón del Maipo; the whole district is volcanic ground.
  for (let i = 0; i < N; i++) {
    if (zone[i] !== Z.fuego) continue;
    ter[i] = T.ASH;
    bio[i] = B.VOLCAN;
    fixed[i] = 1;
  }
  {
    const { x: vx, y: vy, r0, r1, r2, r3 } = VOLCANO;
    for (let y = vy - r0 - 2; y <= vy + r0 + 2; y++) {
      for (let x = vx - r0 - 2; x <= vx + r0 + 2; x++) {
        if (!inb(x, y)) continue;
        const i = idx(x, y);
        const d = Math.hypot(x - vx, y - vy) * (1 + (noise(x, y, 4, 0.25) - 0.5) * 0.18);
        if (d >= r0) continue;
        zone[i] = Z.fuego;
        bio[i] = B.VOLCAN;
        ter[i] = T.ASH;
        fixed[i] = 1;
        if (d < r1) elev[i] = 1;
        if (d < r2) elev[i] = 2;
        if (d < r3) ter[i] = T.LAVA;
      }
    }
  }

  // 4) City hills: Cerro San Cristóbal (a forest) and Cerro Santa Lucía.
  for (const h of HILLS) {
    for (let y = Math.floor(h.y - h.r - 2); y <= h.y + h.r + 2; y++) {
      for (let x = Math.floor(h.x - h.r - 2); x <= h.x + h.r + 2; x++) {
        if (!inb(x, y)) continue;
        const d = Math.hypot(x - h.x, y - h.y) * (1 + (noise(x, y, 5, 0.3) - 0.5) * 0.2);
        if (d >= h.r) continue;
        const i = idx(x, y);
        elev[i] = 1;
        zone[i] = h.zone;
        bio[i] = B.BOSQUE;
        fixed[i] = 1;
        const clearing = Math.hypot(x - h.x, y - h.y) < 2.2;
        ter[i] = clearing ? T.GRASS : noise(x, y, 6, 0.35) > 0.5 ? T.TREE : noise(x, y, 7, 0.3) > 0.45 ? T.TALL : T.GRASS;
      }
    }
  }

  // 5) Fresh water: the two rivers and the lagoon of Parque Bicentenario (with its island).
  const river = (pts: Pt[], width: number) => {
    for (let s = 0; s + 1 < pts.length; s++) {
      const [ax, ay] = pts[s];
      const [bx, by] = pts[s + 1];
      const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 3;
      for (let k = 0; k <= steps; k++) {
        const fx = ax + ((bx - ax) * k) / steps;
        const fy = ay + ((by - ay) * k) / steps + (noise(fx, 0, 8, 0.2) - 0.5) * 2;
        for (let dy = 0; dy < width; dy++) {
          const x = Math.round(fx);
          const y = Math.round(fy) + dy;
          if (!inb(x, y) || elev[idx(x, y)] > 0) continue;
          const i = idx(x, y);
          ter[i] = T.WATER;
          fresh[i] = 1;
          bio[i] = B.LAGO;
        }
      }
    }
  };
  river(MAPOCHO, 2);
  river(MAIPO, 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      const d = ell(x, y, LAGOON) + (noise(x, y, 9, 0.3) - 0.5) * 0.25;
      if (d >= 1 || elev[i] > 0) continue;
      const island = Math.hypot(x - LAGOON.x, y - LAGOON.y) < LAGOON.island;
      ter[i] = island ? T.GRASS : T.WATER;
      fresh[i] = island ? 0 : 1;
      bio[i] = B.LAGO;
      zone[i] = Z.agua;
      fixed[i] = 1;
    }
  }

  // 6) Avenues (2 tiles wide), bridges over the rivers.
  drawRoads(road, W, H, ROADS);
  for (let i = 0; i < N; i++) if (road[i] && elev[i] === 0 && ter[i] !== T.WATER && bio[i] !== B.VOLCAN) bio[i] = B.CIUDAD;

  // 7) Landmarks.
  const set = (x: number, y: number, t: number, b?: number) => {
    if (!inb(x, y)) return;
    const i = idx(x, y);
    if (road[i] && t !== T.PATH) return;
    ter[i] = t;
    if (b !== undefined) bio[i] = b;
    fixed[i] = 1;
  };
  // Cementerio General (Recoleta): rows of graves, cypresses along the walls, tall grass in between.
  for (let y = CEMETERY.y0; y <= CEMETERY.y1; y++) {
    for (let x = CEMETERY.x0; x <= CEMETERY.x1; x++) {
      if (ter[idx(x, y)] === T.WATER) continue;
      const edge = x === CEMETERY.x0 || x === CEMETERY.x1 || y === CEMETERY.y0 || y === CEMETERY.y1;
      const gate = (y === CEMETERY.y1 || y === CEMETERY.y0) && Math.abs(x - (CEMETERY.x0 + CEMETERY.x1) / 2) < 1.5;
      const sideGate = x === CEMETERY.x1 && Math.abs(y - (CEMETERY.y0 + CEMETERY.y1) / 2) < 1.5;
      zone[idx(x, y)] = Z.fantasma;
      if (edge && !gate && !sideGate) set(x, y, hv(x, y, 1) < 0.7 ? T.TREE : T.BUSH, B.PRADERA);
      else if ((x - CEMETERY.x0) % 2 === 1 && (y - CEMETERY.y0) % 3 === 1 && !gate) set(x, y, T.TOMB, B.PRADERA);
      else set(x, y, noise(x, y, 10, 0.4) > 0.55 ? T.TALL : T.GRASS, B.PRADERA);
    }
  }
  // Estadio Nacional (Ñuñoa): an oval of stands around the pitch, with two gates.
  for (let y = Math.floor(STADIUM.y - STADIUM.ry - 1); y <= STADIUM.y + STADIUM.ry + 1; y++) {
    for (let x = Math.floor(STADIUM.x - STADIUM.rx - 1); x <= STADIUM.x + STADIUM.rx + 1; x++) {
      const d = Math.sqrt(ell(x, y, STADIUM));
      if (d >= 1.12) continue;
      zone[idx(x, y)] = Z.lucha;
      const gate = Math.abs(y - STADIUM.y) < 1;
      if (d >= 0.78 && !gate) set(x, y, T.BUILDING, B.CIUDAD);
      else if (d >= 0.62) set(x, y, T.PATH, B.CIUDAD);
      else set(x, y, noise(x, y, 11, 0.5) > 0.6 ? T.TALL : T.GRASS, B.PRADERA);
    }
  }
  // Quinta Normal: the natural history museum with columns, in a park with a pond.
  for (let y = MUSEUM.y0 - 8; y <= MUSEUM.y1 + 5; y++) {
    for (let x = MUSEUM.x0 - 5; x <= MUSEUM.x1 + 5; x++) {
      if (!inb(x, y) || ter[idx(x, y)] === T.WATER || road[idx(x, y)]) continue;
      zone[idx(x, y)] = Z.dragon;
      const inBuilding = x >= MUSEUM.x0 && x <= MUSEUM.x1 && y >= MUSEUM.y0 && y <= MUSEUM.y1;
      if (inBuilding) set(x, y, T.BUILDING, B.CIUDAD);
      else if (y === MUSEUM.y1 + 1 && x >= MUSEUM.x0 && x <= MUSEUM.x1 && (x - MUSEUM.x0) % 2 === 0 && Math.abs(x - 32) > 1) set(x, y, T.PILLAR, B.CIUDAD);
      else if (y >= MUSEUM.y1 + 1 && y <= MUSEUM.y1 + 3 && x >= MUSEUM.x0 && x <= MUSEUM.x1) set(x, y, T.PATH, B.CIUDAD);
      else if (Math.hypot(x - (MUSEUM.x0 - 2), y - (MUSEUM.y0 - 5)) < 2.4) {
        set(x, y, T.WATER, B.LAGO);
        fresh[idx(x, y)] = 1;
      } else {
        const t = noise(x, y, 12, 0.35) > 0.62 ? T.TREE : noise(x, y, 13, 0.3) > 0.52 ? T.TALL : hv(x, y, 2) < 0.08 ? T.FLOWERS : T.GRASS;
        set(x, y, t, B.PRADERA);
      }
    }
  }
  // Estación Central: the station hall, its platform and the tracks going west.
  for (let y = STATION.y0; y <= STATION.y1 + 3; y++) {
    for (let x = STATION.x0; x <= STATION.x1; x++) {
      zone[idx(x, y)] = Z.electrico;
      set(x, y, y <= STATION.y1 ? T.BUILDING : T.PATH, B.CIUDAD);
    }
  }
  for (let x = 3; x < STATION.x0; x++) {
    for (const y of [RAIL_Y, RAIL_Y + 1]) {
      const crossing = x % 8 === 0 || road[idx(x, y)];
      set(x, y, crossing ? T.PATH : T.RAIL, B.CIUDAD);
    }
  }
  // The airport (Pudahuel): wide open fields around the runway.
  for (let y = 16; y <= 28; y++) {
    for (let x = 3; x <= 38; x++) {
      if (!inb(x, y) || ter[idx(x, y)] === T.WATER || road[idx(x, y)] || zone[idx(x, y)] !== Z.aire) continue;
      const nearRunway = Math.abs(y - 22.5) < 3;
      set(x, y, nearRunway ? T.GRASS : noise(x, y, 14, 0.3) > 0.58 ? T.TALL : T.GRASS, B.PRADERA);
    }
  }

  // 8) The rest of each district: city blocks (buildings or parks) or open land.
  //    District borders follow the streets: a whole block belongs to the district of its centre.
  const BLOCK = 8;
  const snapped = zone.slice();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cx = Math.min(W - 1, Math.floor(x / BLOCK) * BLOCK + BLOCK / 2);
      const cy = Math.min(H - 1, Math.floor(y / BLOCK) * BLOCK + BLOCK / 2);
      const i = idx(x, y);
      if (!fixed[i] && !fixed[idx(cx, cy)]) snapped[i] = zone[idx(cx, cy)];
    }
  }
  zone.set(snapped);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      // north-south streets cross the Mapocho on little bridges
      if (ter[i] === T.WATER && !fixed[i] && x % BLOCK === 0 && y < 60) ter[i] = T.BRIDGE;
      if (fixed[i] || road[i] || ter[i] === T.WATER || ter[i] === T.BRIDGE) continue;
      const d = DISTRICTS[zone[i]];
      const street = x % BLOCK === 0 || y % BLOCK === 0;
      const bx = Math.floor(x / BLOCK);
      const by = Math.floor(y / BLOCK);
      const lx = x % BLOCK;
      const ly = y % BLOCK;
      const built = hv(bx, by, 20 + zone[i]) < d.city;
      if (d.type === 'bicho' && !built) {
        // fields and orchards: rows of crops (tall grass), fruit trees, hedges
        bio[i] = B.PRADERA;
        if (street && hv(bx, by, 3) < 0.5) ter[i] = T.PATH;
        else if (street) ter[i] = hv(x, y, 4) < 0.25 ? T.BUSH : T.GRASS;
        else if (hv(bx, by, 5) < 0.3) ter[i] = lx % 2 === 0 && ly % 2 === 0 ? T.TREE : T.GRASS;
        else ter[i] = ly % 2 === 1 ? T.TALL : T.GRASS;
        continue;
      }
      if (d.type === 'aire' && !built) {
        bio[i] = B.PRADERA;
        ter[i] = noise(x, y, 15, 0.25) > 0.6 ? T.TALL : hv(x, y, 6) < 0.02 ? T.BUSH : T.GRASS;
        continue;
      }
      if (street) {
        ter[i] = T.PATH;
        bio[i] = B.CIUDAD;
        continue;
      }
      if (built) {
        // a block of buildings with a green verge (and a few street trees) around it
        const inner = lx >= 2 && lx <= BLOCK - 2 && ly >= 2 && ly <= BLOCK - 2;
        bio[i] = B.CIUDAD;
        ter[i] = inner ? T.BUILDING : hv(x, y, 7) < 0.12 ? T.TREE : hv(x, y, 8) < 0.06 ? T.FLOWERS : T.GRASS;
        continue;
      }
      // parks: tall grass, trees and flowers; rock and boulders in Puente Alto's gravel pits
      if (d.type === 'roca') {
        bio[i] = B.MONTANA;
        ter[i] = noise(x, y, 16, 0.3) > 0.6 ? T.TALL : hv(x, y, 9) < 0.07 ? T.BOULDER : T.ROCK;
        continue;
      }
      const lush = d.type === 'planta';
      bio[i] = lush ? B.BOSQUE : B.PRADERA;
      const n = noise(x, y, 17, 0.3);
      ter[i] =
        n > (lush ? 0.6 : 0.66) ? T.TREE : noise(x, y, 18, 0.35) > 0.5 ? T.TALL : hv(x, y, 10) < (lush ? 0.18 : 0.08) ? T.FLOWERS : T.GRASS;
    }
  }
  // the foothills east of La Florida: forest up to the mountains
  for (let y = 40; y < 78; y++) {
    for (let x = 104; x < W; x++) {
      const i = idx(x, y);
      if (fixed[i] || road[i] || ter[i] === T.WATER || zone[i] !== Z.planta) continue;
      bio[i] = B.BOSQUE;
      ter[i] = noise(x, y, 19, 0.3) > 0.52 ? T.TREE : noise(x, y, 20, 0.3) > 0.45 ? T.TALL : T.GRASS;
    }
  }

  // 9) The mountain plateau and the volcano: tall grass on the rock, boulders here and there.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      if (road[i]) continue;
      if (ter[i] === T.ROCK && elev[i] === 1) {
        if (noise(x, y, 21, 0.16) > 0.6) ter[i] = T.TALL;
        else if (hv(x, y, 11) < 0.035) ter[i] = T.BOULDER;
      } else if ((ter[i] === T.SNOW || ter[i] === T.ASH) && hv(x, y, 12) < 0.04) {
        ter[i] = T.BOULDER;
      }
    }
  }

  // 10) Pave the avenues, then cliffs and stairs where the ground changes height.
  paveRoads(ter, road);
  cliffsAndStairs(ter, elev, road, W, H);

  // 11) Keep the legendary homes and their neighbours walkable.
  for (const s of SPOTS) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = s.x + dx;
        const y = s.y + dy;
        const i = idx(x, y);
        if (road[i] || ter[i] === T.WATER || ter[i] === T.LAVA || ter[i] === T.CLIFF || ter[i] === T.STAIRS || ter[i] === T.BRIDGE) continue;
        if (ter[i] === T.TREE || ter[i] === T.BOULDER || ter[i] === T.BUSH || ter[i] === T.TALL || ter[i] === T.FLOWERS || ter[i] === T.TOMB) {
          ter[i] = bio[i] === B.CUMBRE ? T.SNOW : bio[i] === B.VOLCAN ? T.ASH : bio[i] === B.MONTANA && elev[i] > 0 ? T.ROCK : T.GRASS;
        }
      }
    }
  }

  // 12) Map borders: trees on land.
  borderTrees(ter, W, H);

  const zones: Zone[] = DISTRICTS.map((d) => ({ name: d.name, type: d.type }));
  const m: WorldMap = {
    id: `santiago-v1:${seed}:${W}x${H}`,
    key: 'santiago',
    name: 'Santiago',
    w: W,
    h: H,
    ter,
    elev,
    bio,
    zone,
    zones,
    labels: LABELS,
    fresh,
    reach: new Uint8Array(N),
    spots: SPOTS,
    starts: [],
  };

  // 13) Reachability from the centre (Alameda and the north-south avenue); start on city streets.
  finishMap(m, 50, 50, (i) => elev[i] === 0 && bio[i] === B.CIUDAD);
  return m;
}
