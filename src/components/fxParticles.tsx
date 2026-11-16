// The little pictures attack particles show (flames, bubbles, leaves, notes...), drawn in a
// 20x20 box centred on 0,0. "c1" / "c2" take the attack's two colours, "ink" is the outline.

import type { ReactNode } from 'react';
import type { Particle } from '../game/attacks';

const FIST_16 = 'M2.8 7.2 C2.8 5.6 3.9 5 5 5 H11.4 C12.8 5 13.6 6 13.6 7.3 V11 C13.6 13.1 12 14.6 9.9 14.6 H6 C4.1 14.6 2.8 13.2 2.8 11.4 Z';

export const PARTICLES: Record<Particle, ReactNode> = {
  flame: (
    <>
      <path className="c1" d="M0-10C4-4 8 0 7 4.5 6 9 2.5 10 0 10-3 10-7 8.5-7 4.5-7 0-3-2 0-10Z" />
      <path className="c2" d="M0-2C2 1 3.5 3 3 5.5 2.5 7.5 1 8 0 8-1.5 8-3 7-3 5-3 3-1 2 0-2Z" />
    </>
  ),
  fireball: (
    <>
      <circle className="c1 ink" r="8" />
      <circle className="c2" cx="-1.5" cy="-1.5" r="4.5" />
      <circle fill="#fff" cx="-3" cy="-3" r="1.6" />
    </>
  ),
  ember: (
    <>
      <path className="c1" d="M0-7L4.5 0 0 7-4.5 0Z" />
      <circle className="c2" r="2" />
    </>
  ),
  lava: (
    <>
      <path className="c1 ink" d="M-7-2C-8-7-2-9 2-7 6-8 9-3 7 2 9 6 4 9 0 7-4 9-9 6-7-2Z" />
      <circle className="c2" cx="-2" cy="-3" r="2" />
      <circle className="c2" cx="3" cy="2" r="1.4" />
    </>
  ),
  bubble: (
    <>
      <circle className="c1 soft ink" r="7.5" />
      <ellipse fill="#fff" cx="-2.6" cy="-3.2" rx="2.2" ry="1.4" transform="rotate(-30)" />
    </>
  ),
  drop: (
    <>
      <path className="c1 ink" d="M0-9C3-4 7 0 7 4A7 7 0 0 1-7 4C-7 0-3-4 0-9Z" />
      <ellipse className="c2" cx="-2.6" cy="3" rx="1.3" ry="2.4" />
    </>
  ),
  wave: (
    <>
      <path className="c1 ink" d="M-10 9C-10-1-4-8 3-8 8-8 10-5 10-1 8-4 4-4 2-1 0 2 2 6 6 6 3 9-4 9-10 9Z" />
      <path className="c2-stroke" d="M-5-4C-2-7 4-7 8-4" />
    </>
  ),
  leaf: (
    <>
      <path className="c1 ink" d="M-9 7C-9-3-3-9 9-9 9 1 3 9-9 7Z" />
      <path className="c2-stroke" d="M-7 5L6-6" />
    </>
  ),
  petal: (
    <>
      <path className="c1 ink" d="M0-9C6-5 6 5 0 9-6 5-6-5 0-9Z" />
      <path className="c2-stroke" d="M0-6V6" />
    </>
  ),
  seed: (
    <>
      <path className="c1 ink" d="M0-7C4-3 4 4 0 7-4 4-4-3 0-7Z" />
      <path className="c2-stroke" d="M0-4V4" />
    </>
  ),
  spore: (
    <>
      <circle className="c1 ink" cx="0" cy="-3" r="3.6" />
      <circle className="c1 ink" cx="-3.6" cy="2.6" r="3" />
      <circle className="c1 ink" cx="3.6" cy="2.6" r="3" />
      <circle className="c2" cx="0" cy="-3" r="1.2" />
    </>
  ),
  thorn: <path className="c1 ink" d="M-3.5 7L0-9 3.5 7Z" />,
  vine: (
    <>
      <path className="c1-stroke thick" d="M-9 7C-5-6 0 8 4-2S9-6 9-9" />
      <ellipse className="c2" cx="-3" cy="2" rx="2.6" ry="1.4" transform="rotate(-40 -3 2)" />
      <ellipse className="c2" cx="5" cy="-4" rx="2.6" ry="1.4" transform="rotate(30 5 -4)" />
    </>
  ),
  root: (
    <>
      <path className="c1-stroke thick" d="M0 10V-6M0 1L-6-8M0-1L6-9M0 5L-5 0M0 4L5 1" />
      <circle className="c2" cx="0" cy="-7" r="2" />
    </>
  ),
  spark: (
    <>
      <path className="c1 ink" d="M0-10L2.2-2.2 10 0 2.2 2.2 0 10-2.2 2.2-10 0-2.2-2.2Z" />
      <circle className="c2" r="1.8" />
    </>
  ),
  bolt: <path className="c1 ink" d="M2-10L-6 1H0L-3 10 7-2H1L5-10Z" />,
  snow: (
    <>
      <path className="c1-stroke thick" d="M0-9V9M-7.8-4.5L7.8 4.5M-7.8 4.5L7.8-4.5" />
      <path className="c2-stroke" d="M-2-7L0-5 2-7M-2 7L0 5 2 7" />
    </>
  ),
  shard: (
    <>
      <path className="c1 ink" d="M0-10L4.2 0 0 10-4.2 0Z" />
      <path className="c2-stroke" d="M0-8V8" />
    </>
  ),
  iceball: (
    <>
      <circle className="c1 ink" r="8" />
      <path className="c2-stroke" d="M-5-2C-2 1 2 1 5-2M-4 4C-1 6 1 6 4 4" />
      <circle fill="#fff" cx="-3" cy="-4" r="1.8" />
    </>
  ),
  rock: (
    <>
      <path className="c1 ink" d="M-8 4L-6-5 0-8 7-5 8 3 3 8-4 8Z" />
      <path className="c2-stroke" d="M-3-4L0-1-1 3" />
    </>
  ),
  pebble: <path className="c1 ink" d="M-5 2L-3-4 3-5 6 0 3 5-3 5Z" />,
  dust: (
    <>
      <circle className="c1 soft" cx="-4" cy="2" r="5" />
      <circle className="c1 soft" cx="4" cy="1" r="5.5" />
      <circle className="c1 soft" cx="0" cy="-3" r="5" />
      <circle className="c2" cx="-1" cy="-4" r="1.8" />
    </>
  ),
  feather: (
    <>
      <path className="c1 ink" d="M-8 8C-6 0 0-8 8-9 7-2 2 5-8 8Z" />
      <path className="c2-stroke" d="M-8 8L6-7" />
    </>
  ),
  wind: (
    <>
      <path className="c1-stroke thick" d="M-9 4C-5-6 6-7 9 0" />
      <path className="c2-stroke thick" d="M-6 8C-3 3 3 3 6 6" />
    </>
  ),
  star: (
    <>
      <path className="c1 ink" d="M0-9.5L2.8-3.2 9.5-3 4.2 1.6 6 8.6 0 4.6-6 8.6-4.2 1.6-9.5-3-2.8-3.2Z" />
      <circle className="c2" cx="0" cy="0.6" r="1.8" />
    </>
  ),
  heart: <path className="c1 ink" d="M0 8C-9 2-9-5-4.5-6.5-2-7.3 0-5.5 0-4 0-5.5 2-7.3 4.5-6.5 9-5 9 2 0 8Z" />,
  note: (
    <>
      <ellipse className="c1 ink" cx="-3" cy="5" rx="3.6" ry="2.6" transform="rotate(-25 -3 5)" />
      <path className="c1 ink" d="M-0.2 5V-8H1.8V5Z" />
      <path className="c1 ink" d="M1.8-8C5-7 7-5 6-1 5-4 3-5 1.8-5Z" />
    </>
  ),
  zzz: <path className="c1-stroke thick ink-under" d="M-6-6H6L-6 6H6" />,
  shadow: (
    <>
      <circle className="c1 ink" r="8.5" />
      <ellipse fill="#fff" cx="-3" cy="-1" rx="1.5" ry="2.4" />
      <ellipse fill="#fff" cx="3" cy="-1" rx="1.5" ry="2.4" />
    </>
  ),
  eye: (
    <>
      <path fill="#fff" className="ink" d="M-9.5 0C-5-6.5 5-6.5 9.5 0 5 6.5-5 6.5-9.5 0Z" />
      <circle className="c1" r="3.8" />
      <circle fill="#1c1424" r="1.8" />
    </>
  ),
  ink: <path className="c1" d="M0-8C3-8 2-4 5-5 8-6 6-1 8 1 9 4 4 4 4 7 3 10-1 6-3 8-6 9-5 4-8 3-10 1-6-1-7-4-9-6-4-6-3-5-3-8 0-8Z" />,
  pearl: (
    <>
      <circle className="c1 ink" r="7" />
      <circle className="c2" cx="2" cy="2" r="3.4" />
      <circle fill="#fff" cx="-2.6" cy="-2.6" r="2" />
    </>
  ),
  acorn: (
    <>
      <path className="c1 ink" d="M-6-2C-6 5-2 9 0 9 2 9 6 5 6-2Z" />
      <path className="c2 ink" d="M-7.5-2C-7.5-7 7.5-7 7.5-2Z" />
      <path className="c2-stroke" d="M0-6V-9" />
    </>
  ),
  bamboo: (
    <>
      <rect className="c1 ink" x="-2.8" y="-10" width="5.6" height="20" rx="1.6" />
      <path className="c2-stroke thick" d="M-2.8-3H2.8M-2.8 4H2.8" />
    </>
  ),
  shell: (
    <>
      <path className="c1 ink" d="M-9 4C-9-7 9-7 9 4Z" />
      <path className="c2-stroke" d="M0 4V-5M-4 4L-6-3M4 4L6-3" />
      <rect className="c2 ink" x="-3" y="4" width="6" height="3" rx="1" />
    </>
  ),
  cloud: (
    <>
      <path className="c1 ink" d="M-8 3C-10 0-7-4-4-3-3-7 3-7 4-3 7-5 10 0 8 3 9 7-7 7-8 3Z" />
      <circle className="c2" cx="-1" cy="-2" r="2" />
    </>
  ),
  nectar: (
    <>
      <path className="c1 ink" d="M0-9C3-4 7 0 7 4A7 7 0 0 1-7 4C-7 0-3-4 0-9Z" />
      <circle fill="#fff" cx="-2.5" cy="2.5" r="1.6" />
    </>
  ),
  prism: (
    <>
      <path className="c1 soft ink" d="M0-9L8.5 7H-8.5Z" />
      <path stroke="#f05a5a" strokeWidth="1.4" fill="none" d="M-2 1L7 -2" />
      <path stroke="#f8d838" strokeWidth="1.4" fill="none" d="M-2 2.4L7 1.4" />
      <path stroke="#4fb648" strokeWidth="1.4" fill="none" d="M-2 3.8L7 4.8" />
      <path stroke="#3f8ef0" strokeWidth="1.4" fill="none" d="M-2 5.2L7 8" />
    </>
  ),
  rainbow: (
    <>
      <path stroke="#f05a5a" strokeWidth="2.2" fill="none" d="M-9 6A9 9 0 0 1 9 6" />
      <path stroke="#f8d838" strokeWidth="2.2" fill="none" d="M-6.8 6A6.8 6.8 0 0 1 6.8 6" />
      <path stroke="#4fb648" strokeWidth="2.2" fill="none" d="M-4.6 6A4.6 4.6 0 0 1 4.6 6" />
      <path stroke="#3f8ef0" strokeWidth="2.2" fill="none" d="M-2.4 6A2.4 2.4 0 0 1 2.4 6" />
    </>
  ),
  fist: (
    <g transform="translate(-9.6 -10.4) scale(1.2)">
      <path className="c1 ink" d={FIST_16} />
      <path className="c2-stroke" d="M6.2 5 V8.4 M9 5 V8.4 M11.6 5.2 V8.4" />
    </g>
  ),
  foot: (
    <>
      {/* a sneaker, toe to the right */}
      <path className="c1 ink" d="M-9 4C-9-1-8-5-5-6-3-6-2-4 0-3 3-2 6-2 8 0 10 1 10 4 8 5H-8C-9 5-9 4-9 4Z" />
      <path className="c2 ink" d="M-9 4H9.6C9.6 6 9 7.2 8 7.2H-8C-9 7.2-9.4 6-9 4Z" />
      <path className="c2-stroke" d="M-3-3L-1-5M0-2L2-4M3-1L5-3" />
    </>
  ),
  glove: (
    <>
      <path className="c1 ink" d="M-7 2C-8-6 2-9 6-5 9-2 8 4 4 6H-4C-6 6-7 4-7 2Z" />
      <rect className="c2 ink" x="-5" y="5" width="9" height="4.5" rx="1" />
      <path fill="#fff" opacity="0.7" d="M-4-3C-3-5 0-6 2-5" />
    </>
  ),
  horn: (
    <>
      <path className="c1 ink" d="M-6 9C-5 0-3-6 0-10 3-6 5 0 6 9Z" />
      <path className="c2-stroke" d="M-4.5 3H4.5M-3 -2H3" />
    </>
  ),
  claw: <path className="c1-stroke thick ink-under" d="M-7-8C-3-2-3 3-7 8M0-9C4-3 4 3 0 9M7-8C11-2 11 3 7 8" />,
  jaw: (
    <>
      <path className="c1 ink" d="M-10-3H10V0H-10Z" />
      <path fill="#fff" className="ink" d="M-9 0L-6 6-3 0 0 6 3 0 6 6 9 0Z" />
    </>
  ),
  pincer: (
    <>
      <path className="c1 ink" d="M-1 9C-8 5-8-6-1-9L0-3C-3-2-3 2 0 3Z" />
      <path className="c1 ink" d="M1 9C8 5 8-6 1-9L0-3C3-2 3 2 0 3Z" />
    </>
  ),
  hex: (
    <>
      <path className="c1 soft ink" d="M0-9L8-4.5V4.5L0 9-8 4.5V-4.5Z" />
      <path className="c2-stroke" d="M0-5L4-2.5V2.5L0 5-4 2.5V-2.5Z" />
    </>
  ),
  beak: (
    <>
      <path className="c1 ink" d="M-8-4L9 0-8 4Z" />
      <path className="c2-stroke" d="M-8 0H5" />
    </>
  ),
  fin: (
    <>
      <path className="c1 ink" d="M-9-9C-2-3-2 3-9 9L9 0Z" />
      <path className="c2-stroke" d="M-5-3L5 0-5 3" />
    </>
  ),
  sound: <path className="c1-stroke thick ink-under" d="M-6-5A6 6 0 0 1-6 5M-1-8A10 10 0 0 1-1 8M4-10A13 13 0 0 1 4 10" />,
  boo: (
    <>
      <path fill="#f4f0ff" className="ink" d="M-8 9V-1C-8-7-4-10 0-10S8-7 8-1V9L5 6 2.5 9 0 6-2.5 9-5 6Z" />
      <ellipse className="c1" cx="-3" cy="-2" rx="1.8" ry="2.6" />
      <ellipse className="c1" cx="3" cy="-2" rx="1.8" ry="2.6" />
      <ellipse className="c1" cx="0" cy="3.5" rx="2.2" ry="2.6" />
    </>
  ),
  moon: (
    <>
      <path className="c2 ink" d="M3-9A9 9 0 1 0 3 9 7 7 0 1 1 3-9Z" />
      <circle className="c1" cx="-4" cy="2" r="1.2" />
    </>
  ),
  comet: (
    <>
      <path className="c2 soft" d="M2-3L10-10 5-1 10 4Z" />
      <path className="c1 ink" d="M-2-8L0.2-2.8 5.6-2.6 1.4 1 3-4.4-2 3.8-7 7-5.4 1-9.6-2.6-4.2-2.8Z" transform="translate(-2 4) scale(0.95)" />
    </>
  ),
  chili: (
    <>
      <path className="c1 ink" d="M-8-6C-4-8 0-4 2 0 4 4 7 7 9 9 3 9-3 6-6 2-8-1-9-4-8-6Z" />
      <path className="c2 ink" d="M-9-8C-8-10-6-10-5-8-6-7-7-6-8-6Z" />
    </>
  ),
  banana: (
    <>
      <path className="c1 ink" d="M-8-1C-6 7 5 9 9 2 4 5-3 4-8-1Z" />
      <path className="c2" d="M-9-2L-7 0-8 1Z" />
    </>
  ),
  paw: (
    <>
      <ellipse className="c1 ink" cx="0" cy="3" rx="5.4" ry="4.6" />
      <circle className="c1 ink" cx="-6" cy="-3" r="2.4" />
      <circle className="c1 ink" cx="-2.2" cy="-6.6" r="2.4" />
      <circle className="c1 ink" cx="2.2" cy="-6.6" r="2.4" />
      <circle className="c1 ink" cx="6" cy="-3" r="2.4" />
    </>
  ),
  wheel: (
    <>
      <circle className="c1 ink" r="8.5" />
      <path className="c2-stroke thick" d="M-6-6C-2-3-2 3-6 6M0-8.5C3-4 3 4 0 8.5M6-6C9-2 9 2 6 6" />
    </>
  ),
  spikeball: (
    <>
      <path className="c2 ink" d="M0-10L2-5 7-7 5-2 10 0 5 2 7 7 2 5 0 10-2 5-7 7-5 2-10 0-5-2-7-7-2-5Z" />
      <circle className="c1 ink" r="5" />
    </>
  ),
  pumpkin: (
    <>
      <ellipse className="c1 ink" rx="8.5" ry="6.8" cy="1" />
      <path className="c2-stroke" d="M-3-5C-5-1-5 3-3 7M3-5C5-1 5 3 3 7" />
      <path className="c2 ink" d="M-1-6H1.5L2-9H-0.5Z" />
    </>
  ),
  confetti: <rect className="c1 ink" x="-4" y="-2.2" width="8" height="4.4" rx="0.6" />,
  bell: (
    <>
      <path className="c1 ink" d="M-6 6L-4-6H4L6 6Z" />
      <circle className="c2 ink" cx="0" cy="7.5" r="2.2" />
      <path className="c2-stroke" d="M-4.6-1H4.6" />
    </>
  ),
  branch: (
    <>
      <path className="c1-stroke thick" d="M-9 8L8-8M-2 1L-6-6M3-3L8 1" />
      <ellipse className="c2 ink" cx="-6.5" cy="-6.5" rx="3" ry="1.8" transform="rotate(45 -6.5 -6.5)" />
      <ellipse className="c2 ink" cx="8" cy="1.5" rx="3" ry="1.8" transform="rotate(-30 8 1.5)" />
    </>
  ),
  tentacle: (
    <>
      <path className="c1-stroke fat" d="M-6 9C-9 0 0-9 6-6 9-4 7 1 3 0" />
      <circle className="c2" cx="-6.2" cy="3" r="1.1" />
      <circle className="c2" cx="-4" cy="-3" r="1.1" />
      <circle className="c2" cx="1" cy="-6.6" r="1.1" />
    </>
  ),
  swirl: <path className="c1-stroke thick ink-under" d="M0 0C2 0 2 2 0 2-3 2-3-2 0-3 4-4 6 1 3 5-1 8-7 5-7 0-7-6 0-9 5-8" />,
};

/** One particle picture, `px` pixels wide. */
export function ParticleSvg({ kind, px }: { kind: Particle; px: number }) {
  return (
    <svg className="fxp" viewBox="-11 -11 22 22" width={px} height={px} aria-hidden="true">
      {PARTICLES[kind]}
    </svg>
  );
}
