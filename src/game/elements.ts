// Elemental types (tipos) and their kid-friendly type chart.

export type Elem =
  | 'normal'
  | 'fuego'
  | 'agua'
  | 'planta'
  | 'electrico'
  | 'hielo'
  | 'roca'
  | 'aire'
  | 'bicho'
  | 'fantasma'
  | 'lucha'
  | 'dragon'
  | 'magia';

export const ELEMS: Record<Elem, { name: string; color: string; text: string }> = {
  normal: { name: 'Normal', color: '#b8aa8c', text: '#2a2418' },
  fuego: { name: 'Fuego', color: '#f2683a', text: '#ffffff' },
  agua: { name: 'Agua', color: '#3f8ef0', text: '#ffffff' },
  planta: { name: 'Planta', color: '#4fb648', text: '#ffffff' },
  electrico: { name: 'Eléctrico', color: '#f2c41e', text: '#2a2418' },
  hielo: { name: 'Hielo', color: '#72d2ea', text: '#173040' },
  roca: { name: 'Roca', color: '#a57b4b', text: '#ffffff' },
  aire: { name: 'Aire', color: '#8aa6f2', text: '#ffffff' },
  bicho: { name: 'Bicho', color: '#97ba24', text: '#ffffff' },
  fantasma: { name: 'Fantasma', color: '#7a5aa9', text: '#ffffff' },
  lucha: { name: 'Lucha', color: '#c63c2c', text: '#ffffff' },
  dragon: { name: 'Dragón', color: '#6446e0', text: '#ffffff' },
  magia: { name: 'Magia', color: '#f07fc0', text: '#ffffff' },
};

// Attacking type -> types it is strong against (x2).
const STRONG: Record<Elem, Elem[]> = {
  normal: [],
  fuego: ['planta', 'bicho', 'hielo'],
  agua: ['fuego', 'roca'],
  planta: ['agua', 'roca'],
  electrico: ['agua', 'aire'],
  hielo: ['planta', 'aire', 'dragon'],
  roca: ['fuego', 'hielo', 'aire', 'bicho'],
  aire: ['planta', 'bicho', 'lucha'],
  bicho: ['planta', 'magia'],
  fantasma: ['fantasma', 'magia'],
  lucha: ['normal', 'roca', 'hielo'],
  dragon: ['dragon'],
  magia: ['lucha', 'dragon', 'fantasma'],
};

// Attacking type -> types that resist it (x0.5). There are no immunities:
// every attack always does something, which is less frustrating for kids.
const WEAK: Record<Elem, Elem[]> = {
  normal: ['roca', 'fantasma'],
  fuego: ['agua', 'roca', 'fuego', 'dragon'],
  agua: ['agua', 'planta', 'dragon'],
  planta: ['fuego', 'planta', 'bicho', 'aire', 'dragon'],
  electrico: ['electrico', 'planta', 'roca', 'dragon'],
  hielo: ['fuego', 'agua', 'hielo'],
  roca: ['lucha', 'roca'],
  aire: ['electrico', 'roca'],
  bicho: ['fuego', 'aire', 'fantasma', 'lucha'],
  fantasma: ['normal'],
  lucha: ['aire', 'fantasma', 'magia', 'bicho'],
  dragon: ['magia'],
  magia: ['fuego'],
};

export const TYPE_ORDER = Object.keys(ELEMS) as Elem[];

/** Types this attack type is very effective against (x2). */
export const strongAgainst = (t: Elem): Elem[] => STRONG[t];

/** Types that resist this attack type (x0.5). */
export const weakAgainst = (t: Elem): Elem[] => WEAK[t];

export function effectiveness(attack: Elem, defender: readonly Elem[]): number {
  let m = 1;
  for (const d of defender) {
    if (STRONG[attack].includes(d)) m *= 2;
    else if (WEAK[attack].includes(d)) m *= 0.5;
  }
  return m;
}
