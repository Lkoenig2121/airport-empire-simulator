import { MAP_SIZE, TILE_H, TILE_W } from "./types";

export function iso(x: number, y: number) {
  return {
    x: (x - y) * (TILE_W / 2),
    y: (x + y) * (TILE_H / 2),
  };
}

export function screenToGrid(sx: number, sy: number) {
  const x = sx / (TILE_W / 2);
  const y = sy / (TILE_H / 2);
  return {
    x: Math.floor((x + y) / 2),
    y: Math.floor((y - x) / 2),
  };
}

export function mapPixelSize() {
  return {
    w: MAP_SIZE * TILE_W,
    h: MAP_SIZE * TILE_H,
  };
}

export function inBounds(x: number, y: number, w = 1, h = 1) {
  return x >= 0 && y >= 0 && x + w <= MAP_SIZE && y + h <= MAP_SIZE;
}

export function cellsOf(x: number, y: number, w: number, h: number) {
  const cells: { x: number; y: number }[] = [];
  for (let iy = 0; iy < h; iy++) {
    for (let ix = 0; ix < w; ix++) {
      cells.push({ x: x + ix, y: y + iy });
    }
  }
  return cells;
}

export function cellKey(x: number, y: number) {
  return `${x},${y}`;
}

export function hashCell(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

export function formatCash(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1000)}k`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

export function formatFullCash(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString()}`;
}

export function formatClock(minutes: number) {
  const day = Math.floor(minutes / 1440) + 1;
  const m = Math.floor(minutes % 1440);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = ((hh + 11) % 12) + 1;
  const ap = hh >= 12 ? "PM" : "AM";
  return {
    day,
    clock: `${h12}:${mm.toString().padStart(2, "0")} ${ap}`,
    hours: hh,
    mins: mm,
  };
}

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}
