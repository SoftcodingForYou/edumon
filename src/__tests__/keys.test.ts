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
});

describe('type chart overview', () => {
  it('matches the battle rules', () => {
    for (const a of TYPE_ORDER) {
      for (const d of strongAgainst(a)) expect(effectiveness(a, [d])).toBe(2);
      for (const d of weakAgainst(a)) expect(effectiveness(a, [d])).toBe(0.5);
    }
  });
});
