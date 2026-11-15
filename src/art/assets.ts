// Browser-side image caches (canvases and data URLs) built from the pixel art.

import { drawCreature } from './creatureArt';
import type { PixelImage } from './raster';
import { overworldFrames, playerFrames, AVATARS, ballSprite, type Dir } from './sprites';
import { flipH } from './pixel';
import { getSpecies } from '../game/creatures';
import { getWorldMap } from '../world/maps';
import { renderMapPixels, tallGrassFront } from '../world/tileArt';
import type { MapId, WorldMap } from '../world/tiles';

const urlCache = new Map<string, string>();

export function toCanvas(img: PixelImage): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = img.w;
  cv.height = img.h;
  const ctx = cv.getContext('2d')!;
  const id = ctx.createImageData(img.w, img.h);
  id.data.set(img.data);
  ctx.putImageData(id, 0, 0);
  return cv;
}

const mapCanvases = new Map<string, HTMLCanvasElement>();
/** The whole world drawn once (16 px per tile). */
export function getMapCanvas(map: WorldMap): HTMLCanvasElement {
  let cv = mapCanvases.get(map.id);
  if (!cv) {
    cv = toCanvas(renderMapPixels(map));
    mapCanvases.set(map.id, cv);
  }
  return cv;
}

/** A small picture of a whole world (for choosing the map of a new game). */
export function mapPreviewURL(id: MapId, w: number): string {
  const key = `map-${id}-${w}`;
  let u = urlCache.get(key);
  if (!u) {
    const map = getWorldMap(id);
    const src = getMapCanvas(map);
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = Math.round((w * map.h) / map.w);
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, cv.width, cv.height);
    u = cv.toDataURL('image/png');
    urlCache.set(key, u);
  }
  return u;
}

let grass: HTMLCanvasElement | null = null;
export function getGrassFront(): HTMLCanvasElement {
  if (!grass) grass = toCanvas(tallGrassFront());
  return grass;
}

const playerCache = new Map<number, Record<Dir, HTMLCanvasElement[]>>();
export function getPlayerFrames(avatar: number): Record<Dir, HTMLCanvasElement[]> {
  let f = playerCache.get(avatar);
  if (!f) {
    const fr = playerFrames(AVATARS[avatar] ?? AVATARS[0]);
    f = {
      down: fr.down.map(toCanvas),
      up: fr.up.map(toCanvas),
      left: fr.left.map(toCanvas),
      right: fr.right.map(toCanvas),
    };
    playerCache.set(avatar, f);
  }
  return f;
}

const owCache = new Map<number, { left: HTMLCanvasElement[]; right: HTMLCanvasElement[] }>();
export function getOwFrames(sp: number) {
  let f = owCache.get(sp);
  if (!f) {
    const s = getSpecies(sp);
    const frames = overworldFrames(s.ow, s.art.c[0], s.art.c[1] ?? '#ffffff');
    f = { left: frames.map(toCanvas), right: frames.map((x) => toCanvas(flipH(x))) };
    owCache.set(sp, f);
  }
  return f;
}

function cachedURL(key: string, make: () => PixelImage): string {
  let u = urlCache.get(key);
  if (!u) {
    u = toCanvas(make()).toDataURL('image/png');
    urlCache.set(key, u);
  }
  return u;
}

/** Full-body portrait of a creature (56x56 px, shown scaled up). */
export function portraitURL(sp: number): string {
  return cachedURL('p' + sp, () => {
    const s = getSpecies(sp);
    return drawCreature(s.art, s.stage);
  });
}

const boundsCache = new Map<number, { top: number; cx: number }>();

/** Top of the creature's head and its x center, in portrait pixels (0..56). */
export function portraitBounds(sp: number): { top: number; cx: number } {
  let b = boundsCache.get(sp);
  if (!b) {
    const s = getSpecies(sp);
    // Without the legendary sparkles, so only the body counts.
    const img = drawCreature({ ...s.art, f: (s.art.f ?? []).filter((f) => f !== 'aura') }, s.stage);
    const opaque = (x: number, y: number) => img.data[(y * img.w + x) * 4 + 3] > 0;
    let top = 0;
    while (top < img.h - 1 && ![...Array(img.w).keys()].some((x) => opaque(x, top))) top++;
    let minX = img.w;
    let maxX = 0;
    for (let y = top; y < Math.min(img.h, top + 8); y++) {
      for (let x = 0; x < img.w; x++) {
        if (!opaque(x, y)) continue;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
    }
    b = { top, cx: (minX + maxX + 1) / 2 };
    boundsCache.set(sp, b);
  }
  return b;
}

export function ballURL(grey = false): string {
  return cachedURL(grey ? 'ball-grey' : 'ball', () => ballSprite(grey));
}

export function avatarURL(avatar: number): string {
  return cachedURL('av' + avatar, () => playerFrames(AVATARS[avatar] ?? AVATARS[0]).down[0]);
}

export function avatarBackURL(avatar: number): string {
  return cachedURL('avb' + avatar, () => playerFrames(AVATARS[avatar] ?? AVATARS[0]).up[0]);
}

export function genericURL(sp: number): string {
  return cachedURL('g' + sp, () => {
    const s = getSpecies(sp);
    return overworldFrames(s.ow, s.art.c[0], s.art.c[1] ?? '#ffffff')[0];
  });
}
