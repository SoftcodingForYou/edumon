import { beforeEach, describe, expect, it } from 'vitest';
import {
  createSlot,
  deleteSlot,
  loadSettings,
  loadSlots,
  loadWorldData,
  nameTaken,
  saveSettings,
  saveSlot,
  saveWorldData,
  setStorage,
  cleanName,
} from '../game/save';
import { DEFAULT_KEYS, rebind } from '../system/keys';

function memoryStorage(initial: Record<string, string> = {}) {
  const m = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
    raw: m,
  };
}

let store = memoryStorage();
beforeEach(() => {
  store = memoryStorage();
  setStorage(store);
});

describe('save slots', () => {
  it('creates, reloads and overwrites a slot', () => {
    const s = createSlot('Ana', 'normal', 1, { caught: [1], seen: [1, 4, 7] });
    expect(loadSlots()).toHaveLength(1);
    expect(loadSlots()[0]).toMatchObject({ name: 'Ana', mode: 'normal', avatar: 1, caught: [1], seen: [1, 4, 7] });
    saveSlot({ ...s, seen: [1, 4, 7, 25], caught: [1, 25] });
    const again = loadSlots();
    expect(again).toHaveLength(1);
    expect(again[0].caught).toEqual([1, 25]);
  });

  it('rejects names that already exist (ignoring case and spaces)', () => {
    createSlot('Ana', 'easy', 0);
    expect(nameTaken('ana', loadSlots())).toBe(true);
    expect(nameTaken('  ANA ', loadSlots())).toBe(true);
    expect(nameTaken('Ana 2', loadSlots())).toBe(false);
    expect(() => createSlot('ANA', 'normal', 0)).toThrow();
    expect(() => createSlot('   ', 'normal', 0)).toThrow();
  });

  it('keeps names short and tidy', () => {
    expect(cleanName('  Super   Exploradora  Valiente ')).toBe('Super Explor');
  });

  it('deletes slots', () => {
    const a = createSlot('Uno', 'easy', 0);
    createSlot('Dos', 'normal', 0);
    deleteSlot(a.id);
    expect(loadSlots().map((s) => s.name)).toEqual(['Dos']);
  });

  it('survives broken or strange data', () => {
    store.setItem('edumon.partidas.v1', '{not json');
    expect(loadSlots()).toEqual([]);
    expect(store.raw.get('edumon.partidas.v1.corrupto')).toBe('{not json');
    store.setItem(
      'edumon.partidas.v1',
      JSON.stringify({ slots: [{ id: 'x', name: 'Leo', caught: [3, 3, 999, -1], seen: [2] }, { id: 'y' }] }),
    );
    const slots = loadSlots();
    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({ name: 'Leo', mode: 'normal', caught: [3], seen: [2, 3] });
  });

  it('stores settings, including the chosen keys', () => {
    expect(loadSettings()).toEqual({ sound: true, music: true, font: 'fine', upper: false, keys: DEFAULT_KEYS });
    const keys = rebind(DEFAULT_KEYS, 'a', 'k');
    saveSettings({ sound: false, music: true, font: 'pixel', upper: true, keys });
    expect(loadSettings()).toEqual({ sound: false, music: true, font: 'pixel', upper: true, keys });
    // broken key data falls back to the defaults
    store.setItem('edumon.ajustes.v1', JSON.stringify({ keys: { a: 'q', b: 'q' } }));
    expect(loadSettings().keys).toEqual(DEFAULT_KEYS);
  });

  it('stores the world of a slot separately and removes it with the slot', () => {
    const s = createSlot('Mia', 'easy', 0);
    expect(loadWorldData(s.id)).toBeNull();
    saveWorldData(s.id, { v: 1, hello: 'mundo' });
    expect(loadWorldData(s.id)).toEqual({ v: 1, hello: 'mundo' });
    deleteSlot(s.id);
    expect(loadWorldData(s.id)).toBeNull();
  });

  it('moves games saved under the old name (Educatiomon) to Edumon', () => {
    const slots = JSON.stringify({ version: 1, slots: [{ id: 'old', name: 'Leo', mode: 'easy', caught: [1], seen: [1] }] });
    const old = memoryStorage({
      'educatiomon.partidas.v1': slots,
      'educatiomon.mundo.v1.old': '{"v":1}',
      'educatiomon.ajustes.v1': '{"sound":false}',
    });
    setStorage(old);
    expect(loadSlots().map((x) => x.name)).toEqual(['Leo']);
    expect(loadWorldData('old')).toEqual({ v: 1 });
    expect(loadSettings().sound).toBe(false);
    expect([...old.raw.keys()].some((k) => k.startsWith('educatiomon.'))).toBe(false);
  });
});
