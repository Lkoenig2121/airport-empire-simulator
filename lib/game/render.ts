import { Graphics } from "pixi.js";
import { AIRLINE_BY_ID } from "./catalog";
import { hashCell, iso } from "./iso";
import type { Aircraft, Building, Passenger } from "./types";

export function diamond(g: Graphics, x: number, y: number, color: number, alpha = 1) {
  const a = iso(x, y);
  const b = iso(x + 1, y);
  const c = iso(x + 1, y + 1);
  const d = iso(x, y + 1);
  g.poly([a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y]);
  g.fill({ color, alpha });
}

function footprint(g: Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1) {
  const a = iso(x, y);
  const b = iso(x + w, y);
  const c = iso(x + w, y + h);
  const d = iso(x, y + h);
  g.poly([a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y]).fill({ color, alpha });
}

function line(g: Graphics, x0: number, y0: number, x1: number, y1: number, color: number, width = 1.5, alpha = 1) {
  const a = iso(x0, y0);
  const b = iso(x1, y1);
  g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width, color, alpha });
}

export function isoBox(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  elev: number,
  top: number,
  left: number,
  right: number,
) {
  const a = iso(x, y);
  const b = iso(x + w, y);
  const c = iso(x + w, y + h);
  const d = iso(x, y + h);
  const A = { x: a.x, y: a.y - elev };
  const B = { x: b.x, y: b.y - elev };
  const C = { x: c.x, y: c.y - elev };
  const D = { x: d.x, y: d.y - elev };

  g.poly([a.x + 6, a.y + 4, d.x + 6, d.y + 4, c.x + 6, c.y + 4, b.x + 6, b.y + 4]).fill({
    color: 0x000000,
    alpha: 0.12,
  });
  g.poly([a.x, a.y, d.x, d.y, D.x, D.y, A.x, A.y]).fill(left);
  g.poly([b.x, b.y, c.x, c.y, C.x, C.y, B.x, B.y]).fill(right);
  g.poly([A.x, A.y, B.x, B.y, C.x, C.y, D.x, D.y]).fill(top);
}

function windowsOnFaces(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  elev: number,
  color: number,
) {
  const colsX = Math.max(2, Math.floor(w * 3));
  const colsY = Math.max(2, Math.floor(h * 3));
  const rows = Math.max(2, Math.round(elev / 9));
  for (let row = 0; row < rows; row++) {
    const lift = 5 + row * (elev / (rows + 0.6));
    for (let i = 0; i < colsY; i++) {
      const t = (i + 0.35) / colsY;
      const p = iso(x, y + t * h);
      g.rect(p.x - 2, p.y - lift, 3.2, 2.4).fill({ color, alpha: 0.85 });
    }
    for (let i = 0; i < colsX; i++) {
      const t = (i + 0.35) / colsX;
      const p = iso(x + t * w, y + h);
      g.rect(p.x - 1.2, p.y - lift, 3.2, 2.4).fill({ color, alpha: 0.7 });
    }
  }
}

function peakedRoof(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  elev: number,
  top: number,
  shade: number,
) {
  const a = iso(x, y);
  const b = iso(x + w, y);
  const c = iso(x + w, y + h);
  const d = iso(x, y + h);
  const ridge = iso(x + w / 2, y + h / 2);
  const R = { x: ridge.x, y: ridge.y - elev - 10 };
  const A = { x: a.x, y: a.y - elev };
  const B = { x: b.x, y: b.y - elev };
  const C = { x: c.x, y: c.y - elev };
  const D = { x: d.x, y: d.y - elev };
  g.poly([A.x, A.y, B.x, B.y, R.x, R.y]).fill(top);
  g.poly([B.x, B.y, C.x, C.y, R.x, R.y]).fill(shade);
  g.poly([C.x, C.y, D.x, D.y, R.x, R.y]).fill(top);
  g.poly([D.x, D.y, A.x, A.y, R.x, R.y]).fill(shade);
}

export function drawWaterAndGround(g: Graphics, mapSize: number) {
  g.clear();
  const origin = iso(mapSize / 2, mapSize / 2);
  g.circle(origin.x - 280, origin.y - 220, 70).fill({ color: 0xffe08a, alpha: 0.55 });
  g.circle(origin.x - 280, origin.y - 220, 36).fill({ color: 0xfff4c2, alpha: 0.95 });

  const pad = 10;
  for (let y = -pad; y < mapSize + pad; y++) {
    for (let x = -pad; x < mapSize + pad; x++) {
      const inside = x >= 0 && y >= 0 && x < mapSize && y < mapSize;
      if (!inside) {
        const edge = x >= -1 && y >= -1 && x < mapSize + 1 && y < mapSize + 1;
        diamond(g, x, y, edge ? 0xd8ef9a : 0xf4f8ee, edge ? 0.95 : 0.55);
        continue;
      }
      const n = hashCell(x, y);
      const grass = n > 0.72 ? 0xa8e063 : n > 0.4 ? 0x8fd14f : 0x7dc244;
      diamond(g, x, y, grass);
      if (n > 0.93) {
        const p = iso(x + 0.5, y + 0.5);
        g.ellipse(p.x + 3, p.y + 2, 5, 2.2).fill({ color: 0x000000, alpha: 0.12 });
        g.circle(p.x, p.y - 10, 5.5).fill(0x3f8a2c);
        g.circle(p.x + 2, p.y - 14, 4).fill(0x58a83a);
        g.rect(p.x - 1, p.y - 6, 2, 6).fill(0x7a4a22);
      }
    }
  }

  for (let i = 0; i <= mapSize; i++) {
    const a = iso(i, 0);
    const b = iso(i, mapSize);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y);
    const c = iso(0, i);
    const d = iso(mapSize, i);
    g.moveTo(c.x, c.y).lineTo(d.x, d.y);
  }
  g.stroke({ width: 1, color: 0xffffff, alpha: 0.22 });
}

export function drawBuilding(g: Graphics, b: Building) {
  switch (b.type) {
    case "runway":
      drawRunway(g, b);
      break;
    case "taxiway":
      drawTaxiway(g, b);
      break;
    case "road":
      drawRoad(g, b);
      break;
    case "parking":
      drawParking(g, b);
      break;
    case "terminal":
      drawTerminal(g, b);
      break;
    case "gate":
      drawGate(g, b);
      break;
    case "security":
      drawSecurity(g, b);
      break;
    case "cafe":
      drawCafe(g, b);
      break;
    case "shop":
      drawShop(g, b);
      break;
    case "hangar":
      drawHangar(g, b);
      break;
  }
}

function drawRunway(g: Graphics, b: Building) {
  footprint(g, b.x - 0.08, b.y - 0.08, b.w + 0.16, b.h + 0.16, 0x2a2c30);
  footprint(g, b.x, b.y, b.w, b.h, 0x3d4046);
  const alongX = b.w >= b.h;
  const mid = alongX ? b.y + b.h / 2 : b.x + b.w / 2;
  if (alongX) {
    line(g, b.x + 0.12, b.y + 0.12, b.x + b.w - 0.12, b.y + 0.12, 0xf4f1e6, 1.4);
    line(g, b.x + 0.12, b.y + b.h - 0.12, b.x + b.w - 0.12, b.y + b.h - 0.12, 0xf4f1e6, 1.4);
    for (let x = b.x + 0.7; x < b.x + b.w - 0.5; x += 0.85) {
      line(g, x, mid, x + 0.42, mid, 0xfff7df, 2.2);
    }
    for (let i = 0; i < 6; i++) {
      const t = 0.18 + i * 0.12;
      line(g, b.x + 0.35, b.y + t, b.x + 1.15, b.y + t, 0xf7f3e8, 1.6);
      line(g, b.x + b.w - 1.15, b.y + t, b.x + b.w - 0.35, b.y + t, 0xf7f3e8, 1.6);
    }
    for (let x = b.x; x <= b.x + b.w; x += 1) {
      const p = iso(x, b.y);
      const q = iso(x, b.y + b.h);
      g.circle(p.x, p.y, 1.4).fill(0xffe566);
      g.circle(q.x, q.y, 1.4).fill(0xffe566);
    }
  } else {
    line(g, b.x + 0.12, b.y + 0.12, b.x + 0.12, b.y + b.h - 0.12, 0xf4f1e6, 1.4);
    line(g, b.x + b.w - 0.12, b.y + 0.12, b.x + b.w - 0.12, b.y + b.h - 0.12, 0xf4f1e6, 1.4);
    for (let y = b.y + 0.7; y < b.y + b.h - 0.5; y += 0.85) {
      line(g, mid, y, mid, y + 0.42, 0xfff7df, 2.2);
    }
  }
}

function drawTaxiway(g: Graphics, b: Building) {
  diamond(g, b.x, b.y, 0x8a8778);
  diamond(g, b.x, b.y, 0x9b9888, 0.35);
  line(g, b.x + 0.18, b.y + 0.5, b.x + 0.82, b.y + 0.5, 0xf0d34a, 2);
  line(g, b.x + 0.5, b.y + 0.18, b.x + 0.5, b.y + 0.82, 0xf0d34a, 1.2, 0.55);
}

function drawRoad(g: Graphics, b: Building) {
  diamond(g, b.x, b.y, 0x4b4e54);
  line(g, b.x + 0.2, b.y + 0.5, b.x + 0.42, b.y + 0.5, 0xf2e38a, 1.6);
  line(g, b.x + 0.58, b.y + 0.5, b.x + 0.8, b.y + 0.5, 0xf2e38a, 1.6);
}

function drawParking(g: Graphics, b: Building) {
  footprint(g, b.x, b.y, b.w, b.h, 0x5c6068);
  for (let x = b.x; x < b.x + b.w; x += 1) {
    line(g, x, b.y + 0.08, x, b.y + b.h - 0.08, 0xe8e4d4, 1, 0.7);
  }
  line(g, b.x + 0.08, b.y + b.h / 2, b.x + b.w - 0.08, b.y + b.h / 2, 0xe8e4d4, 1, 0.45);
  const cars = [
    { x: b.x + 0.18, y: b.y + 0.18, c: 0xc45c4a },
    { x: b.x + 1.15, y: b.y + 0.2, c: 0x3d6ea8 },
    { x: b.x + 2.1, y: b.y + 1.15, c: 0xf0f0f2 },
  ];
  for (const car of cars) {
    if (car.x + 0.55 < b.x + b.w && car.y + 0.32 < b.y + b.h) {
      isoBox(g, car.x, car.y, 0.55, 0.28, 5, car.c, shade(car.c, 0.72), shade(car.c, 0.55));
    }
  }
}

function drawTerminal(g: Graphics, b: Building) {
  footprint(g, b.x, b.y, b.w, b.h, 0x9aa7b2);
  isoBox(g, b.x, b.y, b.w, b.h, 12, 0xb7c4ce, 0x7d8d99, 0x667682);
  isoBox(g, b.x + 0.18, b.y + 0.18, b.w - 0.36, b.h - 0.36, 30, 0xe8f4fa, 0x7fb7c9, 0x5e96ab);
  windowsOnFaces(g, b.x + 0.18, b.y + 0.18, b.w - 0.36, b.h - 0.36, 28, 0xf7feff);
  isoBox(g, b.x + 0.9, b.y - 0.12, 1.4, 0.35, 8, 0xd5dee6, 0x8b98a3, 0x74818c);
  isoBox(g, b.x + b.w - 1.3, b.y + 0.35, 0.55, 0.45, 36, 0xcbd5dc, 0x7b8893, 0x66737e);
  isoBox(g, b.x + 0.45, b.y + 0.45, 0.5, 0.4, 34, 0x9ad0e0, 0x5f8f9e, 0x4d7886);
}

function drawGate(g: Graphics, b: Building) {
  footprint(g, b.x, b.y, b.w, b.h, 0x7a7e86);
  line(g, b.x + 0.25, b.y + 0.25, b.x + 1.7, b.y + 1.55, 0xf0d34a, 1.6);
  line(g, b.x + 0.45, b.y + 0.15, b.x + 1.85, b.y + 1.4, 0xf0d34a, 1.2, 0.7);
  isoBox(g, b.x, b.y + 0.9, 0.95, 1.05, 14, 0xd5dde4, 0x8b959f, 0x73808b);
  isoBox(g, b.x + 0.75, b.y + 0.45, 1.1, 0.42, 8, 0xc3ced8, 0x6f8ea3, 0x587588);
  isoBox(g, b.x + 1.35, b.y + 0.15, 0.55, 0.38, 7, 0xb7c4d0, 0x627f92, 0x4e6878);
}

function drawSecurity(g: Graphics, b: Building) {
  isoBox(g, b.x, b.y, b.w, b.h, 16, 0xf3e3a8, 0xc4a85a, 0xa88c42);
  windowsOnFaces(g, b.x, b.y, b.w, b.h, 14, 0xfff6c8);
  isoBox(g, b.x + 0.15, b.y - 0.08, 1.7, 0.28, 6, 0x2b2b2b, 0xf0c43a, 0x2b2b2b);
  isoBox(g, b.x + 0.3, b.y + 0.55, 0.4, 0.35, 7, 0xd9dce0, 0x8a9098, 0x6f757c);
  isoBox(g, b.x + 1.15, b.y + 0.55, 0.4, 0.35, 7, 0xd9dce0, 0x8a9098, 0x6f757c);
}

function drawCafe(g: Graphics, b: Building) {
  isoBox(g, b.x, b.y, b.w, b.h, 14, 0xf2d2b0, 0xd08a55, 0xb46c3c);
  peakedRoof(g, b.x - 0.04, b.y - 0.04, b.w + 0.08, b.h + 0.08, 14, 0xe25b3c, 0xb63d28);
  isoBox(g, b.x + 0.15, b.y - 0.12, 1.7, 0.28, 7, 0xf3c14a, 0xe07a2f, 0xc45d20);
  isoBox(g, b.x + 0.2, b.y + 1.35, 0.35, 0.35, 4, 0xefe4d4, 0xb9a48c, 0x9c8770);
  isoBox(g, b.x + 1.15, b.y + 1.35, 0.35, 0.35, 4, 0xefe4d4, 0xb9a48c, 0x9c8770);
}

function drawShop(g: Graphics, b: Building) {
  isoBox(g, b.x, b.y, b.w, b.h, 16, 0xf2f6fa, 0x3f7eaa, 0x2f658c);
  windowsOnFaces(g, b.x, b.y, b.w, b.h, 12, 0xd9eef8);
  isoBox(g, b.x + 0.08, b.y - 0.1, 1.84, 0.28, 8, 0x1f4e72, 0x173c58, 0x122f45);
  isoBox(g, b.x + 0.25, b.y + 0.15, 0.7, 0.2, 9, 0xe8f6ff, 0x9cc5dc, 0x7aa9c2);
  isoBox(g, b.x + 1.05, b.y + 0.15, 0.7, 0.2, 9, 0xe8f6ff, 0x9cc5dc, 0x7aa9c2);
}

function drawHangar(g: Graphics, b: Building) {
  footprint(g, b.x, b.y, b.w, b.h, 0x6d7380);
  isoBox(g, b.x, b.y, b.w, b.h, 18, 0x9aa3ae, 0x5d6672, 0x4a5260);
  peakedRoof(g, b.x - 0.06, b.y - 0.06, b.w + 0.12, b.h + 0.12, 20, 0xb0bac6, 0x6d7682);
  isoBox(g, b.x + 0.35, b.y + 0.08, 2.3, 0.2, 14, 0x2f3540, 0x232830, 0x1b1f26);
}

function shade(color: number, factor: number) {
  const r = Math.round(((color >> 16) & 255) * factor);
  const g = Math.round(((color >> 8) & 255) * factor);
  const b = Math.round((color & 255) * factor);
  return (r << 16) | (g << 8) | b;
}

export function drawHighlight(
  g: Graphics,
  cells: { x: number; y: number }[],
  color: number,
  alpha = 0.42,
) {
  for (const c of cells) diamond(g, c.x, c.y, color, alpha);
}

export function drawGhost(
  g: Graphics,
  cells: { x: number; y: number }[],
  valid: boolean,
  demolish = false,
) {
  const color = demolish ? 0xef4444 : valid ? 0x4ade80 : 0xf87171;
  drawHighlight(g, cells, color, 0.42);
}

export function drawAircraft(g: Graphics, plane: Aircraft) {
  const p = iso(plane.x + 0.5, plane.y + 0.5);
  const tip = iso(
    plane.x + 0.5 + Math.cos(plane.heading),
    plane.y + 0.5 + Math.sin(plane.heading),
  );
  const angle = Math.atan2(tip.y - p.y, tip.x - p.x);
  const color = AIRLINE_BY_ID[plane.airlineId]?.color ?? 0x2f6fed;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const pt = (dx: number, dy: number) => ({
    x: p.x + dx * c - dy * s,
    y: p.y + dx * s + dy * c - 3,
  });
  const poly = (...pts: { x: number; y: number }[]) => {
    const flat: number[] = [];
    for (const q of pts) flat.push(q.x, q.y);
    return flat;
  };

  g.ellipse(p.x + 4, p.y + 5, 16, 5).fill({ color: 0x000000, alpha: 0.16 });
  g.poly(poly(pt(18, 0), pt(10, 3.2), pt(-16, 2.4), pt(-16, -2.4), pt(10, -3.2))).fill(0xf4f7fb);
  g.poly(poly(pt(8, 0), pt(-2, 15), pt(-7, 15), pt(-4, 0), pt(-7, -15), pt(-2, -15))).fill(0xe6edf4);
  g.poly(poly(pt(-1, 11), pt(-6, 12.5), pt(-8, 10.5), pt(-3, 9.4))).fill(0xc5ced6);
  g.poly(poly(pt(-1, -11), pt(-6, -12.5), pt(-8, -10.5), pt(-3, -9.4))).fill(0xc5ced6);
  g.poly(poly(pt(-12, 0), pt(-20, 6), pt(-18, 0), pt(-20, -6))).fill(0xdee5ec);
  g.poly(poly(pt(-14, 0), pt(-20, 0), pt(-17, -10))).fill(color);
  g.poly(poly(pt(10, 1.6), pt(-12, 1.6), pt(-12, -1.6), pt(10, -1.6))).fill(color);
  g.poly(poly(pt(18, 0), pt(12, 1.6), pt(12, -1.6))).fill(0xd7dee6);
  for (let i = 0; i < 6; i++) {
    const w = pt(8 - i * 3.2, 0);
    g.circle(w.x, w.y, 1.05).fill(0x1d2a36);
  }
}

export function drawPassenger(g: Graphics, pax: Passenger) {
  const p = iso(pax.x + 0.5, pax.y + 0.5);
  g.ellipse(p.x + 1, p.y + 1, 2.4, 1.1).fill({ color: 0x000000, alpha: 0.16 });
  g.roundRect(p.x - 1.7, p.y - 5.2, 3.4, 4.2, 1.2).fill(pax.color);
  g.circle(p.x, p.y - 6.6, 1.7).fill(0xf3e2c8);
}
