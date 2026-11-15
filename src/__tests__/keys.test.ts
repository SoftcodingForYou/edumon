import { describe, expect, it } from 'vitest';
import { BTN_ORDER, DEFAULT_KEYS, keyLabel, rebind, sanitizeBindings } from '../system/keys';
import { TYPE_ORDER, strongAgainst, weakAgainst, effectiveness } from '../game/elements';

describe('key bindings', () => {
  it('has a different key for every button', () => {
    expect(new Set(BTN_ORDER.map((b) => DEFAULT_KEYS[b])).size).toBe(BTN_ORDER.length);
  });

  it('swaps keys instead of giving two buttons the same key', () => {
    const k = rebind(DEFAULT_KEYS, 'a', 'x');
    expect(k.a).toBe('x');
    expect(k.b).toBe('z');
    expect(rebind(DEFAULT_KEYS, 'map', 'Q').map).toBe('q');
  });

  it('shows friendly key names', () => {
    expect(keyLabel('z')).toBe('Z');
    expect(keyLabel(' ')).toBe('Espacio');
    expect(keyLabel('ArrowUp')).toBe('↑');
    expect(keyLabel('Enter')).toBe('Intro');
  });

  it('ignores broken or reserved stored keys', () => {
    expect(sanitizeBindings(null)).toEqual(DEFAULT_KEYS);
    expect(sanitizeBindings({ a: 'Escape' }).a).toBe('z');
    expect(sanitizeBindings({ types: 'z' })).toEqual(DEFAULT_KEYS); // duplicate of A
  });

  it('gives buttons added later (Edudex) a key without losing the chosen ones', () => {
    const old = { up: 'w', down: 's', left: 'a', right: 'd', a: 'j', b: 'k', types: 't', map: 'm' };
    expect(sanitizeBindings(old)).toEqual({ ...old, dex: 'e' });
    // the player already used E for something else: Edudex gets a free key
    const taken = sanitizeBindings({ ...old, types: 'e' });
    expect(taken.types).toBe('e');
    expect(new Set(Object.values(taken)).size).toBe(BTN_ORDER.length);
    expect(taken.dex).not.toBe('e');
  });
});

describe('type chart overview', () => {
  it('matches the battle rules', () => {
    for (const a of TYPE_ORDER) {
      for (const d of strongAgainst(a)) expect(effectiveness(a, [d])).toBe(2);
      for (const d of weakAgainst(a)) expect(effectiveness(a, [d])).toBe(0.5);
    }
  });
});
