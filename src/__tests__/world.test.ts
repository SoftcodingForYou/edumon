import { describe, expect, it } from 'vitest';
import { generateEstaciones } from '../world/mapgen';
import { generateSantiago } from '../world/santiago';
import { getWorldMap } from '../world/maps';
import { B, T, BIOME_HABITAT, MAP_IDS, isWalkable, type WorldMap } from '../world/tiles';
import {
  AUTOSAVE_STEPS,
  createWorld,
  finishEncounter,
  restoreWorld,
  snapshotWorld,
  speciesForZone,
  updateWorld,
  type WorldState,
} from '../world/world';
import { SPECIES } from '../game/creatures';
import { TYPE_ORDER } from '../game/elements';

const map = getWorldMap('estaciones');
const santiago = getWorldMap('santiago');

const fnv = (arrs: ArrayLike<number>[]) => {
  let h = 0x811c9dc5;
  for (const a of arrs) {
    for (let i = 0; i < a.length; i++) {
      h ^= a[i];
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  }
  return h.toString(16);
};

const reachableIn = (m: WorldMap, zone: number) => {
  let n = 0;
  for (let i = 0; i < m.w * m.h; i++) if (m.zone[i] === zone && m.reach[i] && isWalkable(m.ter[i])) n++;
  return n;
};

describe('world maps', () => {
  it('are always the same worlds', () => {
    for (const [m, again] of [
      [map, generateEstaciones()],
      [santiago, generateSantiago()],
    ]) {
      expect(Array.from(again.ter)).toEqual(Array.from(m.ter));
      expect(Array.from(again.elev)).toEqual(Array.from(m.elev));
      expect(Array.from(again.zone)).toEqual(Array.from(m.zone));
    }
  });

  it('keeps Estaciones exactly as it was (saved games point into it)', () => {
    expect(map.id).toBe('v1:1114:120x106');
    expect(fnv([map.ter, map.elev, map.bio, map.fresh, map.reach])).toBe('3f511bac');
    expect(fnv([map.starts])).toBe('9b69459d');
  });

  it('has every landscape the kids were promised', () => {
    const count = (m: WorldMap, t: number) => m.ter.filter((x) => x === t).length;
    for (const t of [T.PATH, T.GRASS, T.TALL, T.SAND, T.WATER, T.ROCK, T.SNOW, T.ASH, T.LAVA, T.CLIFF, T.STAIRS, T.BRIDGE]) {
      expect(count(map, t), `estaciones terrain ${t}`).toBeGreaterThan(0);
    }
    for (const t of [T.PATH, T.GRASS, T.TALL, T.WATER, T.ROCK, T.SNOW, T.ASH, T.LAVA, T.STAIRS, T.BRIDGE, T.BUILDING, T.TOMB, T.RAIL]) {
      expect(count(santiago, t), `santiago terrain ${t}`).toBeGreaterThan(0);
    }
  });

  it('lets you reach every zone and every legendary home', () => {
    for (const id of MAP_IDS) {
      const m = getWorldMap(id);
      expect(m.key).toBe(id);
      m.zones.forEach((z, k) => expect(reachableIn(m, k), `${id}: ${z.name}`).toBeGreaterThan(20));
      expect(m.spots.map((s) => s.species).sort()).toEqual([145, 146, 147, 148, 149, 150]);
      for (const s of m.spots) {
        const i = s.y * m.w + s.x;
        expect(isWalkable(m.ter[i]), `${id}: spot ${s.species}`).toBe(true);
        expect(m.reach[i], `${id}: spot ${s.species}`).toBe(1);
      }
      expect(m.starts.length).toBeGreaterThan(100);
    }
  });

  it('has wild creatures for every zone and every creature lives somewhere', () => {
    for (let b = 0; b < BIOME_HABITAT.length; b++) {
      expect(map.zones[b].habitats).toEqual([BIOME_HABITAT[b]]);
      expect(speciesForZone(map, b).length).toBeGreaterThanOrEqual(8);
    }
    for (const m of [map, santiago]) {
      for (const s of SPECIES) {
        if (s.legendary || s.mythical) continue;
        expect(s.rarity).toBeGreaterThan(0);
        expect(m.zones.some((_, k) => speciesForZone(m, k).includes(s)), `${m.name}: ${s.name}`).toBe(true);
      }
    }
  });
});

describe('Santiago', () => {
  it('has 13 districts, one for every type', () => {
    expect(santiago.zones).toHaveLength(13);
    expect(santiago.zones.map((z) => z.type).sort()).toEqual([...TYPE_ORDER].sort());
    expect(santiago.labels.map((l) => l.name)).toEqual(santiago.zones.map((z) => z.name));
  });

  it('only lets creatures of the district type live there, with tall grass to find them', () => {
    santiago.zones.forEach((z, k) => {
      const pool = speciesForZone(santiago, k);
      expect(pool.length, z.name).toBeGreaterThanOrEqual(6);
      for (const s of pool) expect(s.types).toContain(z.type);
      let tall = 0;
      for (let i = 0; i < santiago.w * santiago.h; i++) if (santiago.zone[i] === k && santiago.ter[i] === T.TALL && santiago.reach[i]) tall++;
      if (z.type !== 'fuego') expect(tall, z.name).toBeGreaterThan(15); // the volcano has none, like in Estaciones
    });
  });

  it('keeps wandering creatures inside districts of their type', () => {
    const ws = createWorld(santiago, [1], 4321);
    for (let i = 0; i < 400; i++) updateWorld(ws, 0.05, { dir: null, run: false });
    expect(ws.creatures.length).toBeGreaterThan(3);
    for (const c of ws.creatures) {
      if (c.sp === 151 || c.spot >= 0) continue;
      const z = santiago.zones[santiago.zone[c.y * santiago.w + c.x]];
      expect(SPECIES[c.sp - 1].types).toContain(z.type);
    }
  });

  it('does not mix up saved games of the two maps', () => {
    const ws = createWorld(santiago, [1], 11);
    expect(santiago.ter[ws.player.y * santiago.w + ws.player.x]).toBe(T.PATH);
    const snap = JSON.parse(JSON.stringify(snapshotWorld(ws)));
    expect(restoreWorld(santiago, snap, [1])).not.toBeNull();
    expect(restoreWorld(map, snap, [1])).toBeNull();
    expect(restoreWorld(santiago, snapshotWorld(createWorld(map, [1], 11)), [1])).toBeNull();
  });
});

describe('world simulation', () => {
  const fresh = (caught: number[] = [1]) => createWorld(map, caught, 1234);

  it('starts the player on a road with creatures around', () => {
    const ws = fresh();
    expect(map.ter[ws.player.y * map.w + ws.player.x]).toBe(T.PATH);
    expect(ws.creatures.length).toBeGreaterThan(3);
  });

  it('walks one tile at a time', () => {
    const ws = fresh();
    ws.creatures = [];
    const { x, y } = ws.player;
    let moved = false;
    for (const dir of ['up', 'down', 'left', 'right'] as const) {
      const before = { x: ws.player.x, y: ws.player.y };
      updateWorld(ws, 0.01, { dir, run: false });
      for (let i = 0; i < 30; i++) updateWorld(ws, 0.02, { dir: null, run: false });
      if (ws.player.x !== before.x || ws.player.y !== before.y) {
        moved = true;
        expect(Math.abs(ws.player.x - before.x) + Math.abs(ws.player.y - before.y)).toBe(1);
      }
    }
    expect(moved).toBe(true);
    void x;
    void y;
  });

  it('meets a creature when walking into it, and it leaves afterwards', () => {
    const ws: WorldState = fresh();
    ws.creatures = [];
    ws.spotCooldown = ws.spotCooldown.map(() => 999);
    const { x, y } = ws.player;
    ws.creatures.push({ uid: 99, sp: 16, x: x + 1, y, fx: x + 1, fy: y, t: 1, moving: false, dir: 'left', dur: 0.3, nextMove: 99, shy: false, spot: -1 });
    const ev = updateWorld(ws, 0.01, { dir: 'right', run: false });
    expect(ev.encounter).toMatchObject({ sp: 16, uid: 99 });
    finishEncounter(ws, ev.encounter!, 'caught');
    expect(ws.creatures.find((c) => c.uid === 99)).toBeUndefined();
    expect(ws.caught.has(16)).toBe(true);
  });

  it('places legendaries at home until they are caught', () => {
    const spot = map.spots[0];
    const near = (caught: number[]) => {
      const ws = fresh(caught);
      ws.player.x = spot.x;
      ws.player.y = spot.y + 3;
      ws.player.fx = ws.player.x;
      ws.player.fy = ws.player.y;
      for (let i = 0; i < 20; i++) updateWorld(ws, 0.05, { dir: null, run: false });
      return ws.creatures.some((c) => c.sp === spot.species && c.x === spot.x && c.y === spot.y);
    };
    expect(near([1])).toBe(true);
    expect(near([1, spot.species])).toBe(false);
  });

  it('keeps wild creatures in their own habitat', () => {
    const ws = fresh();
    for (let i = 0; i < 400; i++) updateWorld(ws, 0.05, { dir: null, run: false });
    for (const c of ws.creatures) {
      if (c.sp === 151 || c.spot >= 0) continue;
      const s = SPECIES[c.sp - 1];
      const zone = map.zone[c.y * map.w + c.x];
      expect(s.habitats).toContain(BIOME_HABITAT[zone]);
    }
    expect(B.PRADERA).toBe(0);
  });
});

describe('saving the exact game state', () => {
  const walkSomewhere = (ws: WorldState, steps: number) => {
    let autosaves = 0;
    let done = 0;
    const dirs = ['up', 'left', 'down', 'right'] as const;
    for (let tries = 0; done < steps && tries < 400; tries++) {
      const before = ws.steps;
      const ev = updateWorld(ws, 0.01, { dir: dirs[Math.floor(tries / 8) % 4], run: false });
      for (let i = 0; i < 20 && ws.player.moving; i++) {
        const e2 = updateWorld(ws, 0.02, { dir: null, run: false });
        if (e2.autosave) autosaves++;
        if (e2.encounter) ws.grace = 99;
      }
      if (ev.autosave) autosaves++;
      done += ws.steps - before;
    }
    return { done, autosaves };
  };

  it('asks to save on every 5th step', () => {
    const ws = createWorld(map, [1], 99);
    ws.grace = 999; // no surprise battles in the tall grass
    ws.creatures = [];
    const { done, autosaves } = walkSomewhere(ws, 12);
    expect(done).toBeGreaterThanOrEqual(10);
    expect(autosaves).toBe(Math.floor(ws.steps / AUTOSAVE_STEPS));
  });

  it('restores player, creatures and randomness exactly', () => {
    const ws = createWorld(map, [1], 7);
    for (let i = 0; i < 100; i++) updateWorld(ws, 0.05, { dir: null, run: false });
    const snap = JSON.parse(JSON.stringify(snapshotWorld(ws)));
    const back = restoreWorld(map, snap, [1])!;
    expect(back).not.toBeNull();
    expect([back.player.x, back.player.y, back.player.dir]).toEqual([ws.player.x, ws.player.y, ws.player.dir]);
    expect(back.creatures.map((c) => [c.uid, c.sp, c.x, c.y])).toEqual(ws.creatures.map((c) => [c.uid, c.sp, c.x, c.y]));
    expect(back.steps).toBe(ws.steps);
    expect([back.rng(), back.rng(), back.rng()]).toEqual([ws.rng(), ws.rng(), ws.rng()]);
  });

  it('refuses data from another world or nonsense', () => {
    const ws = createWorld(map, [1], 3);
    const snap = snapshotWorld(ws);
    expect(restoreWorld(map, { ...snap, map: 'otro-mundo' }, [1])).toBeNull();
    expect(restoreWorld(map, { ...snap, player: { x: 0, y: 0, dir: 'up' } }, [1])).toBeNull(); // sea
    expect(restoreWorld(map, null, [1])).toBeNull();
    expect(restoreWorld(map, 'hola', [1])).toBeNull();
  });

  it('drops legendaries that were caught meanwhile', () => {
    const spot = map.spots[0];
    const ws = createWorld(map, [1], 5);
    ws.player.x = spot.x;
    ws.player.y = spot.y + 3;
    ws.player.fx = ws.player.x;
    ws.player.fy = ws.player.y;
    for (let i = 0; i < 20; i++) updateWorld(ws, 0.05, { dir: null, run: false });
    const snap = snapshotWorld(ws);
    expect(snap.creatures.some((c) => c.sp === spot.species)).toBe(true);
    const back = restoreWorld(map, snap, [1, spot.species])!;
    expect(back.creatures.some((c) => c.sp === spot.species)).toBe(false);
  });
});
