// All the worlds a game can be played in. Each save slot remembers its map.

import { generateEstaciones } from './mapgen';
import { generateSantiago } from './santiago';
import type { MapId, WorldMap } from './tiles';

const cache = new Map<MapId, WorldMap>();

/** The world map of a game (generated once, then cached). */
export function getWorldMap(id: MapId = 'estaciones'): WorldMap {
  let m = cache.get(id);
  if (!m) {
    m = id === 'santiago' ? generateSantiago() : generateEstaciones();
    cache.set(id, m);
  }
  return m;
}
