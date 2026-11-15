// Save slots ("partidas") and settings, stored in the browser's localStorage.
// The Edudex (seen / caught) is saved on every change; the exact state of the
// world (player, wild creatures...) is stored separately every few steps.

import { TOTAL } from './creatures';
import { DEFAULT_KEYS, sanitizeBindings, type KeyBindings } from '../system/keys';

export type Mode = 'normal' | 'easy';

export interface SaveSlot {
  id: string;
  name: string;
  mode: Mode;
  avatar: number;
  seen: number[];
  caught: number[];
  created: number;
  updated: number;
}

export interface Settings {
  sound: boolean;
  music: boolean;
  voice: boolean;
  keys: KeyBindings;
}

export const MAX_NAME = 12;
const PREFIX = 'edumon.';
const OLD_PREFIX = 'educatiomon.'; // the game's former name
const SLOTS_KEY = PREFIX + 'partidas.v1';
const SETTINGS_KEY = PREFIX + 'ajustes.v1';
const WORLD_KEY = PREFIX + 'mundo.v1.';

interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
  key?(i: number): string | null;
  readonly length?: number;
}

// In-memory fallback (private browsing, blocked storage, tests).
const memory = new Map<string, string>();
const memoryStore: KV = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => void memory.set(k, v),
  removeItem: (k) => void memory.delete(k),
};

/** Move games saved before the rename (Educatiomon -> Edumon) to the new keys. */
function migrateOldSaves(s: KV) {
  try {
    if (!s.key || !s.length) return;
    const old: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k?.startsWith(OLD_PREFIX)) old.push(k);
    }
    for (const k of old) {
      const nk = PREFIX + k.slice(OLD_PREFIX.length);
      const v = s.getItem(k);
      if (v !== null && s.getItem(nk) === null) s.setItem(nk, v);
      s.removeItem(k);
    }
  } catch (err) {
    console.warn('No se pudieron mover las partidas antiguas', err);
  }
}

let store: KV | null = null;
function kv(): KV {
  if (store) return store;
  try {
    const ls = (globalThis as { localStorage?: KV }).localStorage;
    if (ls) {
      const probe = '__edumon__';
      ls.setItem(probe, probe);
      ls.removeItem(probe);
      store = ls;
      migrateOldSaves(store);
      return store;
    }
  } catch {
    // fall through to memory
  }
  store = memoryStore;
  return store;
}

/** For tests: use a specific storage. */
export function setStorage(s: KV | null) {
  store = s;
  if (s) migrateOldSaves(s);
}

export function storageIsPersistent(): boolean {
  return kv() !== memoryStore;
}

const validIds = (v: unknown): number[] => {
  if (!Array.isArray(v)) return [];
  const set = new Set<number>();
  for (const x of v) if (Number.isInteger(x) && x >= 1 && x <= TOTAL) set.add(x);
  return [...set].sort((a, b) => a - b);
};

function sanitize(raw: unknown): SaveSlot | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.name !== 'string' || !r.name.trim()) return null;
  const caught = validIds(r.caught);
  const seen = validIds([...(Array.isArray(r.seen) ? r.seen : []), ...caught]);
  return {
    id: r.id,
    name: cleanName(r.name),
    mode: r.mode === 'easy' ? 'easy' : 'normal',
    avatar: Number.isInteger(r.avatar) ? (r.avatar as number) : 0,
    seen,
    caught,
    created: typeof r.created === 'number' ? r.created : Date.now(),
    updated: typeof r.updated === 'number' ? r.updated : Date.now(),
  };
}

export function loadSlots(): SaveSlot[] {
  const raw = kv().getItem(SLOTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { slots?: unknown[] };
    const slots = (parsed.slots ?? []).map(sanitize).filter((s): s is SaveSlot => s !== null);
    return slots.sort((a, b) => b.updated - a.updated);
  } catch {
    // Keep the broken data aside instead of silently losing it.
    kv().setItem(SLOTS_KEY + '.corrupto', raw);
    return [];
  }
}

function writeSlots(slots: SaveSlot[]) {
  try {
    kv().setItem(SLOTS_KEY, JSON.stringify({ version: 1, slots }));
  } catch (err) {
    console.warn('No se pudo guardar la partida', err);
  }
}

export function cleanName(s: string): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
}

/** Names are compared ignoring case and extra spaces ("Ana" == " ana "). */
export function sameName(a: string, b: string): boolean {
  return cleanName(a).toLocaleLowerCase('es') === cleanName(b).toLocaleLowerCase('es');
}

export function nameTaken(name: string, slots: SaveSlot[]): boolean {
  return slots.some((s) => sameName(s.name, name));
}

export function createSlot(name: string, mode: Mode, avatar: number, start: { seen?: number[]; caught?: number[] } = {}): SaveSlot {
  const clean = cleanName(name);
  if (!clean) throw new Error('El nombre está vacío');
  const slots = loadSlots();
  if (nameTaken(clean, slots)) throw new Error('Ese nombre ya existe');
  const now = Date.now();
  const caught = validIds(start.caught ?? []);
  const slot: SaveSlot = {
    id: `p${now.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
    name: clean,
    mode,
    avatar,
    seen: validIds([...(start.seen ?? []), ...caught]),
    caught,
    created: now,
    updated: now,
  };
  writeSlots([slot, ...slots]);
  return slot;
}

/** Overwrite a slot (the chosen game state is always saved onto itself). */
export function saveSlot(slot: SaveSlot): SaveSlot {
  const updated = { ...slot, updated: Date.now() };
  const others = loadSlots().filter((s) => s.id !== slot.id);
  writeSlots([updated, ...others]);
  return updated;
}

export function deleteSlot(id: string) {
  writeSlots(loadSlots().filter((s) => s.id !== id));
  kv().removeItem(WORLD_KEY + id);
}

/** Store the exact world state of a slot (see snapshotWorld in world.ts). */
export function saveWorldData(slotId: string, data: unknown) {
  try {
    kv().setItem(WORLD_KEY + slotId, JSON.stringify(data));
  } catch (err) {
    console.warn('No se pudo guardar el mundo', err);
  }
}

export function loadWorldData(slotId: string): unknown {
  try {
    const raw = kv().getItem(WORLD_KEY + slotId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const DEFAULT_SETTINGS: Settings = { sound: true, music: true, voice: true, keys: { ...DEFAULT_KEYS } };

export function loadSettings(): Settings {
  try {
    const raw = kv().getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, keys: { ...DEFAULT_KEYS } };
    const s = JSON.parse(raw) as Partial<Settings>;
    return {
      sound: s.sound ?? DEFAULT_SETTINGS.sound,
      music: s.music ?? DEFAULT_SETTINGS.music,
      voice: s.voice ?? DEFAULT_SETTINGS.voice,
      keys: sanitizeBindings(s.keys),
    };
  } catch {
    return { ...DEFAULT_SETTINGS, keys: { ...DEFAULT_KEYS } };
  }
}

export function saveSettings(s: Settings) {
  kv().setItem(SETTINGS_KEY, JSON.stringify(s));
}
