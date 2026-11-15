// The living world: the player walks around, wild Edumon wander and
// appear around the player. Pure logic (no drawing), so it can be tested.

import { SPECIES, MYTHICAL_ID, TOTAL, getSpecies, type Habitat, type Species } from '../game/creatures';
import { mulberry32, pickWeighted, type SeededRng } from '../game/rng';
import { T, B, BIOME_HABITAT, canStep, isWalkable, type WorldMap } from './tiles';

export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIR_VEC: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const ALL_DIRS: Dir[] = ['up', 'down', 'left', 'right'];

export interface Mover {
  x: number; // logical cell (destination while moving)
  y: number;
  fx: number; // cell we come from
  fy: number;
  t: number; // 0..1 progress of the current step
  moving: boolean;
  dir: Dir;
  dur: number; // seconds per step
}

export interface Player extends Mover {
  animT: number;
}

export interface WildCreature extends Mover {
  uid: number;
  sp: number;
  nextMove: number;
  shy: boolean;
  spot: number; // index into map.spots for legendaries, -1 otherwise
}

export interface Encounter {
  sp: number;
  uid: number | null; // null = hidden in the tall grass
  spot: number;
  biome: number;
}

export interface WorldState {
  map: WorldMap;
  rng: SeededRng;
  player: Player;
  creatures: WildCreature[];
  time: number;
  grace: number;
  nextUid: number;
  spawnTimer: number;
  spotCooldown: number[];
  caught: Set<number>;
  bumpCooldown: number;
  steps: number; // steps walked (the game saves every AUTOSAVE_STEPS steps)
}

export interface WorldInput {
  dir: Dir | null;
  run: boolean;
}

export interface WorldEvents {
  encounter: Encounter | null;
  bump: boolean;
  rustle: boolean;
  autosave: boolean; // true on every AUTOSAVE_STEPS-th step
}

export const AUTOSAVE_STEPS = 5;

export const WALK_TIME = 0.17;
export const RUN_TIME = 0.095;
const CREATURE_TIME = 0.34;
const FLEE_TIME = 0.24;
const MAX_CREATURES = 14;
const SPAWN_RX = 20;
const SPAWN_RY = 15;
const DESPAWN = 30;
const VIEW_RX = 9;
const VIEW_RY = 7;
export const GRASS_CHANCE = 0.085;

const BY_HABITAT: Record<Habitat, Species[]> = (() => {
  const out = {} as Record<Habitat, Species[]>;
  for (const h of BIOME_HABITAT) out[h] = SPECIES.filter((s) => s.rarity > 0 && s.habitats.includes(h));
  return out;
})();

const ALLOWED_BIOMES: Map<number, Set<number>> = new Map(
  SPECIES.map((s) => [s.id, new Set(s.habitats.map((h) => BIOME_HABITAT.indexOf(h)))]),
);

export function speciesForBiome(biome: number): Species[] {
  return BY_HABITAT[BIOME_HABITAT[biome]] ?? [];
}

export function createWorld(map: WorldMap, caught: number[], seed = Date.now()): WorldState {
  const rng = mulberry32(seed);
  const start = map.starts[Math.floor(rng() * map.starts.length)];
  const x = start % map.w;
  const y = (start - x) / map.w;
  const ws: WorldState = {
    map,
    rng,
    player: { x, y, fx: x, fy: y, t: 1, moving: false, dir: 'down', dur: WALK_TIME, animT: 0 },
    creatures: [],
    time: 0,
    grace: 1,
    nextUid: 1,
    spawnTimer: 0,
    spotCooldown: map.spots.map(() => 0),
    caught: new Set(caught),
    bumpCooldown: 0,
    steps: 0,
  };
  for (let k = 0; k < 60 && ws.creatures.length < 10; k++) trySpawn(ws, true);
  return ws;
}

const occupied = (ws: WorldState, x: number, y: number) => ws.creatures.some((c) => c.x === x && c.y === y);

function pickSpecies(ws: WorldState, biome: number): number | null {
  const caughtCount = ws.caught.size;
  if (!ws.caught.has(MYTHICAL_ID) && ws.rng() < 0.004 + 0.02 * (caughtCount / 150)) return MYTHICAL_ID;
  return pickWeighted(ws.rng, speciesForBiome(biome), (s) => s.rarity)?.id ?? null;
}

function addCreature(ws: WorldState, sp: number, x: number, y: number, spot: number) {
  const s = getSpecies(sp);
  ws.creatures.push({
    uid: ws.nextUid++,
    sp,
    x,
    y,
    fx: x,
    fy: y,
    t: 1,
    moving: false,
    dir: ws.rng() < 0.5 ? 'left' : 'right',
    dur: CREATURE_TIME,
    nextMove: 0.5 + ws.rng() * 1.5,
    shy: spot < 0 && ws.rng() < (s.stage >= 2 || s.mythical ? 0.5 : 0.25),
    spot,
  });
}

function trySpawn(ws: WorldState, allowVisible: boolean): boolean {
  const { map, player: p, rng } = ws;
  for (let a = 0; a < 16; a++) {
    const x = p.x + Math.floor(rng() * (SPAWN_RX * 2 + 1)) - SPAWN_RX;
    const y = p.y + Math.floor(rng() * (SPAWN_RY * 2 + 1)) - SPAWN_RY;
    if (x < 0 || y < 0 || x >= map.w || y >= map.h) continue;
    const i = y * map.w + x;
    const t = map.ter[i];
    if (!map.reach[i] || !isWalkable(t) || t === T.STAIRS || t === T.BRIDGE) continue;
    const ax = Math.abs(x - p.x);
    const ay = Math.abs(y - p.y);
    if (ax + ay < 5) continue;
    if (!allowVisible && ax <= VIEW_RX && ay <= VIEW_RY) continue;
    if (occupied(ws, x, y)) continue;
    const sp = pickSpecies(ws, map.bio[i]);
    if (!sp) continue;
    addCreature(ws, sp, x, y, -1);
    return true;
  }
  return false;
}

function spawnSpots(ws: WorldState) {
  const p = ws.player;
  ws.map.spots.forEach((s, k) => {
    if (ws.caught.has(s.species) || ws.spotCooldown[k] > 0) return;
    if (ws.creatures.some((c) => c.spot === k)) return;
    if (Math.abs(s.x - p.x) > 24 || Math.abs(s.y - p.y) > 18) return;
    if ((p.x === s.x && p.y === s.y) || (p.fx === s.x && p.fy === s.y)) return;
    if (occupied(ws, s.x, s.y)) return;
    addCreature(ws, s.species, s.x, s.y, k);
  });
}

function despawnFar(ws: WorldState) {
  const p = ws.player;
  ws.creatures = ws.creatures.filter((c) => {
    const d = Math.abs(c.x - p.x) + Math.abs(c.y - p.y);
    return c.spot >= 0 ? d < 46 : d <= DESPAWN;
  });
}

function creatureCanEnter(ws: WorldState, c: WildCreature, nx: number, ny: number): boolean {
  const { map, player: p } = ws;
  if (!canStep(map, c.x, c.y, nx, ny)) return false;
  const i = ny * map.w + nx;
  const t = map.ter[i];
  if (t === T.STAIRS || t === T.BRIDGE) return false;
  if (c.sp !== MYTHICAL_ID && !ALLOWED_BIOMES.get(c.sp)?.has(map.bio[i])) return false;
  if (p.x === nx && p.y === ny) return false;
  if (p.moving && p.fx === nx && p.fy === ny) return false;
  return !occupied(ws, nx, ny);
}

function updateCreatures(ws: WorldState, dt: number) {
  const { rng, player: p } = ws;
  for (const c of ws.creatures) {
    if (c.moving) {
      c.t += dt / c.dur;
      if (c.t >= 1) {
        c.t = 1;
        c.moving = false;
      }
      continue;
    }
    if (c.spot >= 0) continue; // legendaries wait at home
    c.nextMove -= dt;
    if (c.nextMove > 0) continue;
    const dist = Math.abs(c.x - p.x) + Math.abs(c.y - p.y);
    const distAfter = (d: Dir) => Math.abs(c.x + DIR_VEC[d][0] - p.x) + Math.abs(c.y + DIR_VEC[d][1] - p.y);
    const dirs = [...ALL_DIRS].sort(() => rng() - 0.5);
    let fleeing = false;
    if (c.shy && dist <= 4 && rng() < 0.85) {
      dirs.sort((a, b) => distAfter(b) - distAfter(a));
      fleeing = true;
    } else if (rng() < 0.35) {
      c.nextMove = 0.5 + rng() * 1.2;
      continue;
    }
    for (const d of dirs) {
      if (fleeing && distAfter(d) < dist) continue;
      const nx = c.x + DIR_VEC[d][0];
      const ny = c.y + DIR_VEC[d][1];
      if (!creatureCanEnter(ws, c, nx, ny)) continue;
      c.fx = c.x;
      c.fy = c.y;
      c.x = nx;
      c.y = ny;
      c.t = 0;
      c.moving = true;
      c.dir = d;
      c.dur = fleeing ? FLEE_TIME : CREATURE_TIME;
      break;
    }
    c.nextMove = fleeing ? 0.12 + rng() * 0.25 : 0.7 + rng() * 1.6;
  }
}

function updatePlayer(ws: WorldState, dt: number, input: WorldInput, ev: WorldEvents) {
  const { map, player: p } = ws;
  if (p.moving) {
    p.t += dt / p.dur;
    p.animT += dt;
    if (p.t < 1) return;
    p.t = 1;
    p.moving = false;
    ws.steps++;
    if (ws.steps % AUTOSAVE_STEPS === 0) ev.autosave = true;
    const i = p.y * map.w + p.x;
    if (map.ter[i] === T.TALL) {
      ev.rustle = true;
      if (ws.grace <= 0 && ws.rng() < GRASS_CHANCE) {
        const sp = pickSpecies(ws, map.bio[i]);
        if (sp) {
          ev.encounter = { sp, uid: null, spot: -1, biome: map.bio[i] };
          return;
        }
      }
    }
  }
  if (!input.dir) {
    p.animT = 0;
    return;
  }
  p.dir = input.dir;
  const nx = p.x + DIR_VEC[input.dir][0];
  const ny = p.y + DIR_VEC[input.dir][1];
  const c = ws.creatures.find((cr) => cr.x === nx && cr.y === ny);
  if (c) {
    ev.encounter = { sp: c.sp, uid: c.uid, spot: c.spot, biome: map.bio[ny * map.w + nx] };
    return;
  }
  if (canStep(map, p.x, p.y, nx, ny)) {
    p.fx = p.x;
    p.fy = p.y;
    p.x = nx;
    p.y = ny;
    p.t = 0;
    p.moving = true;
    p.dur = input.run ? RUN_TIME : WALK_TIME;
  } else if (ws.bumpCooldown <= 0) {
    ev.bump = true;
    ws.bumpCooldown = 0.35;
  }
}

export function updateWorld(ws: WorldState, dtRaw: number, input: WorldInput): WorldEvents {
  const dt = Math.min(dtRaw, 0.05);
  const ev: WorldEvents = { encounter: null, bump: false, rustle: false, autosave: false };
  ws.time += dt;
  ws.grace = Math.max(0, ws.grace - dt);
  ws.bumpCooldown -= dt;
  for (let k = 0; k < ws.spotCooldown.length; k++) ws.spotCooldown[k] = Math.max(0, ws.spotCooldown[k] - dt);
  updatePlayer(ws, dt, input, ev);
  if (ev.encounter) return ev;
  updateCreatures(ws, dt);
  ws.spawnTimer -= dt;
  if (ws.spawnTimer <= 0) {
    ws.spawnTimer = 0.45;
    despawnFar(ws);
    if (ws.creatures.filter((c) => c.spot < 0).length < MAX_CREATURES) trySpawn(ws, false);
    spawnSpots(ws);
  }
  return ev;
}

export type Outcome = 'caught' | 'fled' | 'ran' | 'lost';

/** Clean up after a battle: the met creature leaves the map either way. */
export function finishEncounter(ws: WorldState, enc: Encounter, outcome: Outcome) {
  if (enc.uid !== null) ws.creatures = ws.creatures.filter((c) => c.uid !== enc.uid);
  if (enc.spot >= 0 && outcome !== 'caught') ws.spotCooldown[enc.spot] = 25;
  if (outcome === 'caught') ws.caught.add(enc.sp);
  ws.grace = 1.5;
}

export function biomeOfPlayer(ws: WorldState): number {
  return ws.map.bio[ws.player.y * ws.map.w + ws.player.x] ?? B.PRADERA;
}

// ------------------------------------------------------------ saving

/** Everything needed to continue exactly where the player was. */
export interface WorldSnapshot {
  v: 1;
  map: string;
  steps: number;
  time: number;
  grace: number;
  nextUid: number;
  spawnTimer: number;
  rng: number;
  player: { x: number; y: number; dir: Dir };
  creatures: { uid: number; sp: number; x: number; y: number; dir: Dir; shy: boolean; spot: number; nextMove: number }[];
  spotCooldown: number[];
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;

export function snapshotWorld(ws: WorldState): WorldSnapshot {
  const p = ws.player;
  return {
    v: 1,
    map: ws.map.id,
    steps: ws.steps,
    time: r3(ws.time),
    grace: r3(ws.grace),
    nextUid: ws.nextUid,
    spawnTimer: r3(ws.spawnTimer),
    rng: ws.rng.getState(),
    player: { x: p.x, y: p.y, dir: p.dir },
    creatures: ws.creatures.map((c) => ({ uid: c.uid, sp: c.sp, x: c.x, y: c.y, dir: c.dir, shy: c.shy, spot: c.spot, nextMove: r3(c.nextMove) })),
    spotCooldown: ws.spotCooldown.map(r3),
  };
}

const isDir = (d: unknown): d is Dir => d === 'up' || d === 'down' || d === 'left' || d === 'right';
const num = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Rebuild a saved world. Returns null when the data doesn't fit this world. */
export function restoreWorld(map: WorldMap, data: unknown, caught: number[]): WorldState | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Partial<WorldSnapshot>;
  if (d.v !== 1 || d.map !== map.id || !d.player) return null;
  const okCell = (x: unknown, y: unknown): boolean =>
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    (x as number) >= 0 &&
    (y as number) >= 0 &&
    (x as number) < map.w &&
    (y as number) < map.h &&
    isWalkable(map.ter[(y as number) * map.w + (x as number)]) &&
    map.reach[(y as number) * map.w + (x as number)] === 1;
  const { x, y } = d.player;
  if (!okCell(x, y)) return null;

  const caughtSet = new Set(caught);
  const used = new Set<number>([y * map.w + x]);
  const creatures: WildCreature[] = [];
  for (const c of Array.isArray(d.creatures) ? d.creatures : []) {
    if (!c || !okCell(c.x, c.y) || !Number.isInteger(c.sp) || c.sp < 1 || c.sp > TOTAL) continue;
    const cell = c.y * map.w + c.x;
    if (used.has(cell)) continue;
    const spot = Number.isInteger(c.spot) && c.spot >= 0 && c.spot < map.spots.length && map.spots[c.spot].species === c.sp ? c.spot : -1;
    if (spot >= 0 && caughtSet.has(c.sp)) continue;
    used.add(cell);
    creatures.push({
      uid: Number.isInteger(c.uid) ? c.uid : 0,
      sp: c.sp,
      x: c.x,
      y: c.y,
      fx: c.x,
      fy: c.y,
      t: 1,
      moving: false,
      dir: isDir(c.dir) ? c.dir : 'left',
      dur: CREATURE_TIME,
      nextMove: clamp(num(c.nextMove, 1), 0, 5),
      shy: !!c.shy,
      spot,
    });
  }
  let nextUid = Math.max(1, Math.floor(num(d.nextUid, 1)));
  const uids = new Set<number>();
  for (const c of creatures) {
    if (c.uid < 1 || uids.has(c.uid)) c.uid = nextUid++;
    uids.add(c.uid);
    nextUid = Math.max(nextUid, c.uid + 1);
  }
  return {
    map,
    rng: mulberry32(Number.isInteger(d.rng) ? (d.rng as number) : Date.now()),
    player: { x, y, fx: x, fy: y, t: 1, moving: false, dir: isDir(d.player.dir) ? d.player.dir : 'down', dur: WALK_TIME, animT: 0 },
    creatures,
    time: Math.max(0, num(d.time, 0)),
    grace: clamp(num(d.grace, 0), 0, 2),
    nextUid,
    spawnTimer: clamp(num(d.spawnTimer, 0), 0, 1),
    spotCooldown: map.spots.map((_, k) => clamp(num(d.spotCooldown?.[k], 0), 0, 60)),
    caught: caughtSet,
    bumpCooldown: 0,
    steps: Math.max(0, Math.floor(num(d.steps, 0))),
  };
}
