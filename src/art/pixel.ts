// Hand-made pixel art helpers: sprites written as strings of palette letters.

import { hexToRgb, type PixelImage } from './raster';

export function fromStrings(rows: string[], pal: Record<string, string>): PixelImage {
  const h = rows.length;
  const w = rows[0].length;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    if (row.length !== w) throw new Error(`Sprite row ${y} has length ${row.length}, expected ${w}: "${row}"`);
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const col = pal[ch];
      if (!col) throw new Error(`No palette color for "${ch}"`);
      const [r, g, b] = hexToRgb(col);
      const i = (y * w + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { w, h, data };
}

export function flipH(img: PixelImage): PixelImage {
  const data = new Uint8ClampedArray(img.data.length);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const s = (y * img.w + x) * 4;
      const d = (y * img.w + (img.w - 1 - x)) * 4;
      data[d] = img.data[s];
      data[d + 1] = img.data[s + 1];
      data[d + 2] = img.data[s + 2];
      data[d + 3] = img.data[s + 3];
    }
  }
  return { w: img.w, h: img.h, data };
}

/** Mirror the left half of every row onto the right half (for symmetric sprites). */
export function mirrorRows(rows: string[]): string[] {
  return rows.map((r) => r + [...r].reverse().join(''));
}
