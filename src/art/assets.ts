// Browser-side image caches (canvases and data URLs) built from the pixel art.
//
// iOS Safari may throw away the pixels of canvases when memory runs short (e.g. during a
// battle), and a canvas that is never redrawn then stays blank. So the big world picture is
// kept as plain pixel data (ImageData, ordinary memory) and the small sprite canvases are
// rebuilt whenever the player comes back to the world (refreshWorldArt).

import { drawCreature } from './creatureArt';
import type { PixelImage } from './raster';
import { overworldFrames, playerFrames, AVATARS, ballSprite, signSprite, type Dir } from './sprites';
import { flipH } from './pixel';
import { getSpecies } from '../game/creatures';
import { getWorldMap } from '../world/maps';
import { renderMapPixels, tallGrassFront } from '../world/tileArt';
import type { MapId, WorldMap } from '../world/tiles';

const urlCache = new Map<string, string>();

/** Give a canvas' memory back right away (Safari only frees it late otherwise). */
export function releaseCanvas(cv: HTMLCanvasElement) {
  cv.width = 0;
  cv.height = 0;
}

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

const mapPixels = new Map<string, ImageData>();
/** The whole world drawn once (16 px per tile), as pixel data that can't get lost. */
export function getMapPixels(map: WorldMap): ImageData {
  let id = mapPixels.get(map.id);
  if (!id) {
    const img = renderMapPixels(map);
    id = new ImageData(img.data, img.w, img.h);
    mapPixels.set(map.id, id);
  }
  return id;
}

/** A fresh canvas with the whole world on it; free it with releaseCanvas when done. */
export function makeMapCanvas(map: WorldMap): HTMLCanvasElement {
  const id = getMapPixels(map);
  const cv = document.createElement('canvas');
  cv.width = id.width;
  cv.height = id.height;
  cv.getContext('2d')!.putImageData(id, 0, 0);
  return cv;
}

/** A small picture of a whole world (for choosing the map of a new game). */
export function mapPreviewURL(id: MapId, w: number): string {
  const key = `map-${id}-${w}`;
  let u = urlCache.get(key);
  if (!u) {
    const map = getWorldMap(id);
    const src = makeMapCanvas(map);
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = Math.round((w * map.h) / map.w);
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, cv.width, cv.height);
    u = cv.toDataURL('image/png');
    releaseCanvas(src);
    releaseCanvas(cv);
    urlCache.set(key, u);
  }
  return u;
}

/** Forget the sprite canvases so they are drawn again (they may have been wiped meanwhile). */
export function refreshWorldArt() {
  grass = null;
  playerCache.clear();
  owCache.clear();
  sign = null;
}

let sign: HTMLCanvasElement | null = null;
/** The sign standing at a legendary's home while it is away. */
export function getSign(): HTMLCanvasElement {
  if (!sign) sign = toCanvas(signSprite());
  return sign;
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

const owCache = new Map<string, { left: HTMLCanvasElement[]; right: HTMLCanvasElement[] }>();
/** A wild creature's look in the world: the same for every creature of its kind. */
export function getOwFrames(sp: number) {
  const kind = getSpecies(sp).ow;
  let f = owCache.get(kind);
  if (!f) {
    const frames = overworldFrames(kind);
    f = { left: frames.map(toCanvas), right: frames.map((x) => toCanvas(flipH(x))) };
    owCache.set(kind, f);
  }
  return f;
}

function cachedURL(key: string, make: () => PixelImage): string {
  let u = urlCache.get(key);
  if (!u) {
    const cv = toCanvas(make());
    u = cv.toDataURL('image/png');
    releaseCanvas(cv);
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

/** The generic world look of a creature's kind (it doesn't give away which creature it is). */
export function genericURL(sp: number): string {
  const kind = getSpecies(sp).ow;
  return cachedURL('g-' + kind, () => overworldFrames(kind)[0]);
}
