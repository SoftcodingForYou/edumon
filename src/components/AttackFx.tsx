import type { CSSProperties } from 'react';
import { ELEMS, type Elem } from '../game/elements';

// Centers of the two fighters on the 768x576 battle stage.
const CENTER = { mine: [204, 282], wild: [570, 130] } as const;

type Kind = 'shot' | 'rain' | 'bolt' | 'punch' | 'burst';

/** How each type's attack looks: flying flames, bubbles, leaves, a lightning strike... */
const FX: Record<Elem, { kind: Kind; count: number; hit: number; word?: string }> = {
  fuego: { kind: 'shot', count: 7, hit: 520 },
  agua: { kind: 'shot', count: 8, hit: 560 },
  planta: { kind: 'shot', count: 6, hit: 540 },
  electrico: { kind: 'bolt', count: 1, hit: 260 },
  hielo: { kind: 'shot', count: 7, hit: 520 },
  roca: { kind: 'rain', count: 5, hit: 500 },
  aire: { kind: 'shot', count: 4, hit: 520 },
  bicho: { kind: 'shot', count: 9, hit: 560 },
  fantasma: { kind: 'shot', count: 3, hit: 600 },
  lucha: { kind: 'punch', count: 1, hit: 300, word: '¡ZAS!' },
  dragon: { kind: 'shot', count: 9, hit: 560 },
  magia: { kind: 'shot', count: 8, hit: 560 },
  normal: { kind: 'burst', count: 1, hit: 140, word: '¡PUM!' },
};

/** Milliseconds from the start of the attack until it hits. */
export const fxHitDelay = (t: Elem) => FX[t].hit;

// Small fixed offsets so particles don't all fly on the same line.
const SPREAD = [0, -14, 12, -6, 18, -18, 6, 14, -10, 9];

interface Props {
  from: 'mine' | 'wild';
  type: Elem;
  strong: boolean; // very effective: bigger impact
}

export function AttackFx({ from, type, strong }: Props) {
  const [sx, sy] = CENTER[from];
  const [tx, ty] = CENTER[from === 'mine' ? 'wild' : 'mine'];
  const cfg = FX[type];
  const vars = {
    '--sx': `${sx}px`,
    '--sy': `${sy}px`,
    '--tx': `${tx}px`,
    '--ty': `${ty}px`,
    '--dx': `${tx - sx}px`,
    '--dy': `${ty - sy}px`,
    '--dir': from === 'mine' ? 1 : -1,
    '--c': ELEMS[type].color,
    '--hit': `${cfg.hit}ms`,
  } as CSSProperties;

  return (
    <div className={`afx afx-${type} afx-${cfg.kind}${strong ? ' afx-strong' : ''}`} style={vars}>
      {cfg.kind === 'shot' &&
        Array.from({ length: cfg.count }, (_, i) => (
          <i key={i} className="p" style={{ '--i': i, '--o': `${SPREAD[i % SPREAD.length]}px`, '--o2': `${SPREAD[(i + 3) % SPREAD.length]}px` } as CSSProperties} />
        ))}
      {cfg.kind === 'rain' &&
        Array.from({ length: cfg.count }, (_, i) => (
          <i key={i} className="p rock" style={{ '--i': i, '--o': `${SPREAD[i] * 2.2}px` } as CSSProperties} />
        ))}
      {cfg.kind === 'bolt' && (
        <svg className="bolt" viewBox="0 0 60 220" width="60" height="220">
          <polyline points="34,0 18,70 38,78 14,150 34,156 24,220" />
        </svg>
      )}
      {cfg.kind === 'punch' && (
        <svg className="fist" viewBox="0 0 16 16" width="64" height="64">
          <path d="M2.8 7.2 C2.8 5.6 3.9 5 5 5 H11.4 C12.8 5 13.6 6 13.6 7.3 V11 C13.6 13.1 12 14.6 9.9 14.6 H6 C4.1 14.6 2.8 13.2 2.8 11.4 Z" />
          <path className="lines" d="M6.2 5 V8.4 M9 5 V8.4 M11.6 5.2 V8.4" />
        </svg>
      )}
      {cfg.word && <span className="pow">{cfg.word}</span>}
      <div className="impact">
        {Array.from({ length: strong ? 12 : 8 }, (_, i) => (
          <i key={i} style={{ '--a': `${(360 / (strong ? 12 : 8)) * i}deg` } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}

/** Dizzy stars circling above a knocked-out creature's head. */
export function KoStars({ x, y }: { x: number; y: number }) {
  return (
    <div className="ko-stars" style={{ left: x, top: y }} aria-label="K.O.">
      <i />
      <i />
      <i />
    </div>
  );
}
