import type { Building, BuildId } from "../game/types";
import { MAP_SIZE } from "../game/types";
import type { Destination, FlightCraft } from "./types";

export type CameraMode = "chase" | "cockpit";
type Vec3 = [number, number, number];
type RGB = [number, number, number];

export const WORLD_SCALE = 60;
const CELL = 28;
const CRUISE_RENDER_ALT = 650;
const NEAR = 0.6;
const PATCH = 400;
const PATCH_RADIUS = 14;
const AIRPORT_RANGE = 15000;
const FOG_END = 16000;

const SKY_TOP: RGB = [58, 118, 196];
const HAZE: RGB = [206, 226, 240];
const BASE_GROUND: RGB = [150, 178, 112];
const LIGHT: Vec3 = norm([0.35, 0.85, -0.4]);

const FIELD_COLORS: RGB[] = [
  [104, 158, 70],
  [122, 170, 78],
  [142, 176, 84],
  [168, 180, 96],
  [92, 140, 62],
  [186, 170, 110],
  [116, 150, 74],
];

const FLAT: Partial<Record<BuildId, { color: RGB; lift: number }>> = {
  taxiway: { color: [112, 114, 120], lift: 0.12 },
  road: { color: [92, 92, 98], lift: 0.1 },
  parking: { color: [134, 134, 140], lift: 0.1 },
  runway: { color: [66, 68, 74], lift: 0.2 },
};

const BOX: Partial<Record<BuildId, { color: RGB; roof: RGB; height: number }>> = {
  terminal: { color: [232, 234, 240], roof: [168, 186, 204], height: 16 },
  hangar: { color: [172, 178, 188], roof: [128, 136, 148], height: 13 },
  gate: { color: [204, 206, 214], roof: [150, 156, 168], height: 5 },
  security: { color: [214, 206, 188], roof: [170, 160, 140], height: 6 },
  cafe: { color: [226, 172, 92], roof: [186, 118, 60], height: 5 },
  shop: { color: [126, 172, 222], roof: [80, 120, 176], height: 5 },
};

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}
function dot(a: Vec3, b: Vec3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a: Vec3): Vec3 {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}
function mix(a: RGB, b: RGB, t: number): RGB {
  const k = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}
function css(c: RGB, alpha = 1) {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;
}
function hash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

export function renderAltitude(altFt: number) {
  return 34 + (Math.max(0, altFt) / 9200) * CRUISE_RENDER_ALT;
}

export function navToWorld(x: number, y: number, h = 0): Vec3 {
  return [x * WORLD_SCALE, h, y * WORLD_SCALE];
}

type Basis = { f: Vec3; r: Vec3; u: Vec3 };

function basisFrom(heading: number, pitchRad: number, rollRad: number): Basis {
  const f = norm([Math.cos(heading) * Math.cos(pitchRad), Math.sin(pitchRad), Math.sin(heading) * Math.cos(pitchRad)]);
  let r = norm(cross(f, [0, 1, 0]));
  let u = cross(r, f);
  const c = Math.cos(rollRad);
  const s = Math.sin(rollRad);
  const r2 = sub(scale(r, c), scale(u, s));
  const u2 = add(scale(u, c), scale(r, s));
  r = r2;
  u = u2;
  return { f, r, u };
}

function lookAt(from: Vec3, to: Vec3, rollRad: number): Basis {
  const f = norm(sub(to, from));
  let r = norm(cross(f, [0, 1, 0]));
  let u = cross(r, f);
  const c = Math.cos(rollRad);
  const s = Math.sin(rollRad);
  const r2 = sub(scale(r, c), scale(u, s));
  const u2 = add(scale(u, c), scale(r, s));
  r = r2;
  u = u2;
  return { f, r, u };
}

type Camera = Basis & { pos: Vec3; focal: number; cx: number; cy: number };

type Item = { depth: number; draw: (ctx: CanvasRenderingContext2D) => void };

function toCam(cam: Camera, p: Vec3): Vec3 {
  const d = sub(p, cam.pos);
  return [dot(d, cam.r), dot(d, cam.u), dot(d, cam.f)];
}

function clipNear(pts: Vec3[]): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const ain = a[2] >= NEAR;
    const bin = b[2] >= NEAR;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (NEAR - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]);
    }
  }
  return out;
}

function projectPoly(cam: Camera, world: Vec3[]) {
  const camPts = clipNear(world.map((p) => toCam(cam, p)));
  if (camPts.length < 3) return null;
  let depth = 0;
  const screen = camPts.map((p) => {
    depth += p[2];
    return [cam.cx + (p[0] / p[2]) * cam.focal, cam.cy - (p[1] / p[2]) * cam.focal] as const;
  });
  return { screen, depth: depth / camPts.length };
}

function projectPoint(cam: Camera, p: Vec3) {
  const c = toCam(cam, p);
  if (c[2] < NEAR) return null;
  return { x: cam.cx + (c[0] / c[2]) * cam.focal, y: cam.cy - (c[1] / c[2]) * cam.focal, z: c[2] };
}

function fillPoly(
  ctx: CanvasRenderingContext2D,
  pts: readonly (readonly [number, number])[],
  color: string | CanvasGradient,
) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function fogFor(cam: Camera, p: Vec3) {
  return Math.min(1, Math.hypot(p[0] - cam.pos[0], p[2] - cam.pos[2]) / FOG_END);
}

function quad(x0: number, z0: number, x1: number, z1: number, y: number): Vec3[] {
  return [
    [x0, y, z0],
    [x1, y, z0],
    [x1, y, z1],
    [x0, y, z1],
  ];
}

function boxFaces(min: Vec3, max: Vec3) {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  return [
    { n: [0, 1, 0] as Vec3, pts: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]] as Vec3[], top: true },
    { n: [1, 0, 0] as Vec3, pts: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]] as Vec3[], top: false },
    { n: [-1, 0, 0] as Vec3, pts: [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]] as Vec3[], top: false },
    { n: [0, 0, 1] as Vec3, pts: [[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]] as Vec3[], top: false },
    { n: [0, 0, -1] as Vec3, pts: [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]] as Vec3[], top: false },
  ];
}

function shade(color: RGB, n: Vec3): RGB {
  const k = 0.58 + 0.42 * Math.max(0, dot(n, LIGHT));
  return [color[0] * k, color[1] * k, color[2] * k];
}

function airportOrigin(d: Destination): Vec3 {
  const c = navToWorld(d.x, d.y);
  return [c[0] - (MAP_SIZE / 2) * CELL, 0, c[2] - (MAP_SIZE / 2) * CELL];
}

function drawAirport(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  dest: Destination,
  buildings: Building[],
  items: Item[],
) {
  const o = airportOrigin(dest);
  const size = MAP_SIZE * CELL;
  const center: Vec3 = [o[0] + size / 2, 0, o[2] + size / 2];
  const fog = fogFor(cam, center);
  const fogged = (c: RGB) => css(mix(c, HAZE, fog * 0.92));

  const apron = projectPoly(cam, quad(o[0] - 40, o[2] - 40, o[0] + size + 40, o[2] + size + 40, 0.05));
  if (apron) fillPoly(ctx, apron.screen, fogged([196, 186, 156]));

  const near = Math.hypot(center[0] - cam.pos[0], center[2] - cam.pos[2]) < 7000;

  for (const layer of ["parking", "road", "taxiway", "runway"] as BuildId[]) {
    const spec = FLAT[layer]!;
    for (const b of buildings) {
      if (b.type !== layer) continue;
      const x0 = o[0] + b.x * CELL;
      const z0 = o[2] + b.y * CELL;
      const x1 = x0 + b.w * CELL;
      const z1 = z0 + b.h * CELL;
      const poly = projectPoly(cam, quad(x0, z0, x1, z1, spec.lift));
      if (poly) fillPoly(ctx, poly.screen, fogged(spec.color));
      if (layer === "runway" && near) {
        const alongX = b.w >= b.h;
        const len = alongX ? x1 - x0 : z1 - z0;
        const midA = alongX ? (z0 + z1) / 2 : (x0 + x1) / 2;
        for (let s = 30; s < len - 30; s += 44) {
          const a0 = (alongX ? x0 : z0) + s;
          const a1 = a0 + 22;
          const stripe = alongX ? quad(a0, midA - 1, a1, midA + 1, 0.3) : quad(midA - 1, a0, midA + 1, a1, 0.3);
          const sp = projectPoly(cam, stripe);
          if (sp) fillPoly(ctx, sp.screen, fogged([245, 245, 245]));
        }
        for (let k = 0; k < 6; k++) {
          const off = -14 + k * 5.6;
          for (const end of [8, len - 20]) {
            const a0 = (alongX ? x0 : z0) + end;
            const bar = alongX ? quad(a0, midA + off, a0 + 12, midA + off + 2.6, 0.3) : quad(midA + off, a0, midA + off + 2.6, a0 + 12, 0.3);
            const bp = projectPoly(cam, bar);
            if (bp) fillPoly(ctx, bp.screen, fogged([245, 245, 245]));
          }
        }
      }
    }
  }

  for (const b of buildings) {
    const spec = BOX[b.type];
    if (!spec) continue;
    const x0 = o[0] + b.x * CELL + 2;
    const z0 = o[2] + b.y * CELL + 2;
    const x1 = o[0] + (b.x + b.w) * CELL - 2;
    const z1 = o[2] + (b.y + b.h) * CELL - 2;
    for (const face of boxFaces([x0, 0, z0], [x1, spec.height, z1])) {
      const fc = face.pts.reduce<Vec3>((acc, p) => add(acc, scale(p, 0.25)), [0, 0, 0]);
      if (dot(face.n, sub(cam.pos, fc)) <= 0) continue;
      const poly = projectPoly(cam, face.pts);
      if (!poly) continue;
      const color = css(mix(shade(face.top ? spec.roof : spec.color, face.n), HAZE, fog * 0.92));
      items.push({ depth: poly.depth, draw: (c) => fillPoly(c, poly.screen, color) });
    }
  }
}

function drawBeacon(cam: Camera, dest: Destination, items: Item[], distanceLabel: string) {
  const c = navToWorld(dest.x, dest.y);
  const w = 26;
  const faces = boxFaces([c[0] - w, 0, c[2] - w], [c[0] + w, 520, c[2] + w]);
  for (const face of faces) {
    if (face.top) continue;
    const poly = projectPoly(cam, face.pts);
    if (!poly) continue;
    items.push({ depth: poly.depth, draw: (g) => fillPoly(g, poly.screen, "rgba(255,214,90,0.28)") });
  }
  const top = projectPoint(cam, [c[0], 560, c[2]]);
  if (top) {
    items.push({
      depth: 0,
      draw: (g) => {
        g.save();
        g.fillStyle = "#ffd65a";
        g.beginPath();
        g.moveTo(top.x, top.y + 14);
        g.lineTo(top.x - 9, top.y);
        g.lineTo(top.x + 9, top.y);
        g.closePath();
        g.fill();
        g.font = "600 12px ui-sans-serif, system-ui, sans-serif";
        g.textAlign = "center";
        g.lineWidth = 3;
        g.strokeStyle = "rgba(0,0,0,0.55)";
        const label = `${dest.name} · ${distanceLabel}`;
        g.strokeText(label, top.x, top.y - 6);
        g.fillStyle = "#fff8e0";
        g.fillText(label, top.x, top.y - 6);
        g.restore();
      },
    });
  } else {
    items.push({
      depth: 0,
      draw: (g) => {
        const rel = toCam(cam, c);
        const ang = Math.atan2(-rel[1], rel[0]);
        const ex = cam.cx + Math.cos(ang) * cam.cx * 0.85;
        g.save();
        g.translate(ex, cam.cy * 0.35);
        g.rotate(rel[0] >= 0 ? 0 : Math.PI);
        g.fillStyle = "#ffd65a";
        g.beginPath();
        g.moveTo(16, 0);
        g.lineTo(0, -10);
        g.lineTo(0, 10);
        g.closePath();
        g.fill();
        g.restore();
      },
    });
  }
}

function drawClouds(cam: Camera, items: Item[]) {
  const size = 1500;
  const gx = Math.floor(cam.pos[0] / size);
  const gz = Math.floor(cam.pos[2] / size);
  for (let iz = -7; iz <= 7; iz++) {
    for (let ix = -7; ix <= 7; ix++) {
      const cx = gx + ix;
      const cz = gz + iz;
      const h = hash(cx * 3 + 11, cz * 7 + 5);
      if (h < 0.5) continue;
      const pos: Vec3 = [
        (cx + hash(cx, cz + 9)) * size,
        360 + hash(cx + 4, cz) * 560,
        (cz + hash(cx + 2, cz + 1)) * size,
      ];
      const p = projectPoint(cam, pos);
      if (!p) continue;
      const radius = (140 + h * 220) / p.z * cam.focal;
      if (radius < 2) continue;
      const fade = 1 - Math.min(1, Math.hypot(pos[0] - cam.pos[0], pos[2] - cam.pos[2]) / 10500);
      if (fade <= 0) continue;
      items.push({
        depth: p.z,
        draw: (g) => {
          g.fillStyle = `rgba(255,255,255,${0.78 * fade})`;
          g.beginPath();
          g.ellipse(p.x, p.y, radius, radius * 0.42, 0, 0, Math.PI * 2);
          g.ellipse(p.x - radius * 0.55, p.y + radius * 0.08, radius * 0.6, radius * 0.3, 0, 0, Math.PI * 2);
          g.ellipse(p.x + radius * 0.6, p.y + radius * 0.06, radius * 0.55, radius * 0.28, 0, 0, Math.PI * 2);
          g.ellipse(p.x + radius * 0.1, p.y - radius * 0.2, radius * 0.5, radius * 0.32, 0, 0, Math.PI * 2);
          g.fill();
        },
      });
    }
  }
}

type MeshFace = { pts: Vec3[]; n: Vec3; color: RGB };

const WHITE: RGB = [244, 246, 250];
const WING_GREY: RGB = [222, 226, 233];
const ENGINE_GREY: RGB = [206, 211, 219];
const INTAKE: RGB = [46, 50, 58];
const GLASS: RGB = [34, 44, 62];

function faceCenter(pts: Vec3[]): Vec3 {
  return scale(pts.reduce<Vec3>((acc, p) => add(acc, p), [0, 0, 0]), 1 / pts.length);
}

function orientedFace(pts: Vec3[], inside: Vec3, color: RGB): MeshFace {
  let n = norm(cross(sub(pts[1], pts[0]), sub(pts[pts.length - 1], pts[0])));
  if (dot(n, sub(faceCenter(pts), inside)) < 0) n = scale(n, -1);
  return { pts, n, color };
}

type Section = { a: number; r: number; ry?: number; y?: number; z?: number };

function loft(sections: Section[], color: RGB, sides: number, frontCap?: RGB, backCap?: RGB): MeshFace[] {
  const rings = sections.map((s) =>
    Array.from({ length: sides }, (_, i) => {
      const t = (i / sides) * Math.PI * 2;
      return [s.a, (s.y ?? 0) + Math.sin(t) * (s.ry ?? s.r), (s.z ?? 0) + Math.cos(t) * s.r] as Vec3;
    }),
  );
  const faces: MeshFace[] = [];
  for (let k = 0; k < rings.length - 1; k++) {
    const s0 = sections[k];
    const s1 = sections[k + 1];
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      const pts = [rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]];
      const fc = faceCenter(pts);
      const axis: Vec3 = [fc[0], ((s0.y ?? 0) + (s1.y ?? 0)) / 2, ((s0.z ?? 0) + (s1.z ?? 0)) / 2];
      faces.push(orientedFace(pts, axis, color));
    }
  }
  const first = sections[0];
  const last = sections[sections.length - 1];
  if (first.r > 0.08) {
    faces.push({ pts: [...rings[0]], n: first.a > last.a ? [1, 0, 0] : [-1, 0, 0], color: frontCap ?? color });
  }
  if (last.r > 0.08) {
    faces.push({ pts: [...rings[rings.length - 1]], n: last.a > first.a ? [1, 0, 0] : [-1, 0, 0], color: backCap ?? color });
  }
  return faces;
}

function hexa(corners: Vec3[], color: RGB): MeshFace[] {
  const inside = faceCenter(corners);
  const [p0, p1, p2, p3, p4, p5, p6, p7] = corners;
  return [
    [p0, p1, p2, p3],
    [p4, p5, p6, p7],
    [p0, p1, p5, p4],
    [p1, p2, p6, p5],
    [p2, p3, p7, p6],
    [p3, p0, p4, p7],
  ].map((pts) => orientedFace(pts, inside, color));
}

function sweptSurface(opts: {
  rootLE: number;
  rootChord: number;
  tipLE: number;
  tipChord: number;
  rootSpan: number;
  tipSpan: number;
  rootY: number;
  tipY: number;
  rootThick: number;
  tipThick: number;
  side: 1 | -1;
  color: RGB;
}): MeshFace[] {
  const s = opts.side;
  const rz = opts.rootSpan * s;
  const tz = opts.tipSpan * s;
  const rt = opts.rootThick / 2;
  const tt = opts.tipThick / 2;
  return hexa(
    [
      [opts.rootLE, opts.rootY - rt, rz],
      [opts.tipLE, opts.tipY - tt, tz],
      [opts.tipLE - opts.tipChord, opts.tipY - tt, tz],
      [opts.rootLE - opts.rootChord, opts.rootY - rt, rz],
      [opts.rootLE, opts.rootY + rt, rz],
      [opts.tipLE, opts.tipY + tt, tz],
      [opts.tipLE - opts.tipChord, opts.tipY + tt, tz],
      [opts.rootLE - opts.rootChord, opts.rootY + rt, rz],
    ],
    opts.color,
  );
}

function slab(c: Vec3, s: Vec3, color: RGB): MeshFace[] {
  const [x, y, z] = c;
  const [hx, hy, hz] = [s[0] / 2, s[1] / 2, s[2] / 2];
  return hexa(
    [
      [x - hx, y - hy, z - hz],
      [x + hx, y - hy, z - hz],
      [x + hx, y - hy, z + hz],
      [x - hx, y - hy, z + hz],
      [x - hx, y + hy, z - hz],
      [x + hx, y + hy, z - hz],
      [x + hx, y + hy, z + hz],
      [x - hx, y + hy, z + hz],
    ],
    color,
  );
}

function buildAirliner(): MeshFace[] {
  const faces: MeshFace[] = [];
  faces.push(
    ...loft(
      [
        { a: 19.6, r: 0.08, y: -0.35 },
        { a: 19.0, r: 0.95, ry: 0.85, y: -0.3 },
        { a: 17.8, r: 1.62, ry: 1.55, y: -0.12 },
        { a: 16.0, r: 1.95, ry: 1.98 },
        { a: -10.5, r: 1.95, ry: 1.98 },
        { a: -15.0, r: 1.45, ry: 1.5, y: 0.45 },
        { a: -18.6, r: 0.62, ry: 0.7, y: 1.1 },
        { a: -19.6, r: 0.22, ry: 0.3, y: 1.25 },
      ],
      WHITE,
      14,
    ),
  );

  for (const side of [1, -1] as const) {
    faces.push(
      ...sweptSurface({
        rootLE: 4.5,
        rootChord: 7.4,
        tipLE: -4.8,
        tipChord: 1.9,
        rootSpan: 1.6,
        tipSpan: 17.2,
        rootY: -1.05,
        tipY: -0.05,
        rootThick: 0.55,
        tipThick: 0.16,
        side,
        color: WING_GREY,
      }),
    );
    faces.push(
      ...hexa(
        [
          [-4.8, -0.12, 17.2 * side],
          [-6.7, -0.12, 17.2 * side],
          [-7.3, 2.2, 17.45 * side],
          [-6.2, 2.2, 17.45 * side],
          [-4.8, -0.12, 17.05 * side],
          [-6.7, -0.12, 17.05 * side],
          [-7.3, 2.2, 17.3 * side],
          [-6.2, 2.2, 17.3 * side],
        ],
        WING_GREY,
      ),
    );
    faces.push(
      ...loft(
        [
          { a: 8.6, r: 1.12, y: -2.35, z: 5.9 * side },
          { a: 8.1, r: 1.25, y: -2.35, z: 5.9 * side },
          { a: 5.0, r: 1.18, y: -2.35, z: 5.9 * side },
          { a: 3.6, r: 0.72, y: -2.3, z: 5.9 * side },
        ],
        ENGINE_GREY,
        12,
        INTAKE,
        [120, 124, 130],
      ),
    );
    faces.push(...slab([4.6, -1.45, 5.9 * side], [3.6, 1.1, 0.34], WING_GREY));
    faces.push(
      ...sweptSurface({
        rootLE: -14.2,
        rootChord: 4.2,
        tipLE: -17.6,
        tipChord: 1.6,
        rootSpan: 0.9,
        tipSpan: 6.6,
        rootY: 0.75,
        tipY: 1.05,
        rootThick: 0.3,
        tipThick: 0.12,
        side,
        color: WING_GREY,
      }),
    );
    faces.push(...slab([0.4, 0.62, 1.93 * side], [27, 0.26, 0.05], GLASS));
    faces.push(...slab([17.05, 0.62, 1.42 * side], [1.25, 0.42, 0.06], GLASS));
  }

  faces.push(
    ...hexa(
      [
        [-12.4, 1.55, -0.2],
        [-17.6, 8.6, -0.1],
        [-20.0, 8.6, -0.1],
        [-18.6, 1.15, -0.2],
        [-12.4, 1.55, 0.2],
        [-17.6, 8.6, 0.1],
        [-20.0, 8.6, 0.1],
        [-18.6, 1.15, 0.2],
      ],
      WHITE,
    ),
  );
  return faces;
}

const AIRLINER = buildAirliner();

function drawPlane(ctx: CanvasRenderingContext2D, cam: Camera, pos: Vec3, basis: Basis) {
  const toWorld = (p: Vec3) => add(pos, add(add(scale(basis.f, p[0]), scale(basis.u, p[1])), scale(basis.r, p[2])));
  const dirWorld = (n: Vec3) => add(add(scale(basis.f, n[0]), scale(basis.u, n[1])), scale(basis.r, n[2]));
  const faces: { depth: number; screen: readonly (readonly [number, number])[]; color: string }[] = [];
  for (const face of AIRLINER) {
    const n = dirWorld(face.n);
    const pts = face.pts.map(toWorld);
    if (dot(n, sub(cam.pos, faceCenter(pts))) <= 0) continue;
    const poly = projectPoly(cam, pts);
    if (!poly) continue;
    faces.push({ depth: poly.depth, screen: poly.screen, color: css(shade(face.color, n)) });
  }
  faces.sort((a, b) => b.depth - a.depth);
  for (const f of faces) {
    fillPoly(ctx, f.screen, f.color);
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
}

export type RenderInput = {
  craft: FlightCraft;
  mode: CameraMode;
  camHeading: number;
  time: number;
  destinations: Destination[];
  targetId: string;
  buildingsFor: (id: string) => Building[];
  distanceLabel: string;
  tint: "normal" | "approach" | "arrive";
};

export function renderScene(ctx: CanvasRenderingContext2D, w: number, h: number, input: RenderInput) {
  const { craft, mode } = input;
  const pitch = (craft.pitch * Math.PI) / 180;
  const bank = (craft.bank * Math.PI) / 180;
  const planePos = navToWorld(craft.x, craft.y, renderAltitude(craft.alt));
  const planeBasis = basisFrom(craft.heading, pitch * 0.6, bank);

  let cam: Camera;
  if (mode === "cockpit") {
    const b = basisFrom(craft.heading, pitch * 0.6, bank);
    const pos = add(planePos, add(scale(b.u, 0.9), scale(b.f, 17.6)));
    cam = { ...b, pos, focal: h * 0.75, cx: w / 2, cy: h * 0.46 };
  } else {
    const hf: Vec3 = [Math.cos(input.camHeading), 0, Math.sin(input.camHeading)];
    const side: Vec3 = [-Math.sin(input.camHeading), 0, Math.cos(input.camHeading)];
    const pos = add(planePos, add(add(scale(hf, -70), scale(side, 26)), [0, 15 + Math.sin(pitch) * -12, 0]));
    pos[1] = Math.max(4, pos[1]);
    const target = add(planePos, add(scale(hf, 22), [0, 1, 0]));
    const b = lookAt(pos, target, bank * 0.2);
    cam = { ...b, pos, focal: h * 0.95, cx: w / 2, cy: h * 0.52 };
  }

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, css(SKY_TOP));
  sky.addColorStop(0.55, css(mix(SKY_TOP, HAZE, 0.75)));
  sky.addColorStop(1, css(HAZE));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const far = 60000;
  const base = projectPoly(cam, quad(cam.pos[0] - far, cam.pos[2] - far, cam.pos[0] + far, cam.pos[2] + far, 0));
  if (base) {
    const g = ctx.createLinearGradient(0, cam.cy - h * 0.1, 0, h);
    g.addColorStop(0, css(mix(BASE_GROUND, HAZE, 0.75)));
    g.addColorStop(0.35, css(mix(BASE_GROUND, HAZE, 0.25)));
    g.addColorStop(1, css(BASE_GROUND));
    fillPoly(ctx, base.screen, g);
  }

  const px = Math.floor(cam.pos[0] / PATCH);
  const pz = Math.floor(cam.pos[2] / PATCH);
  const patches: { depth: number; screen: readonly (readonly [number, number])[]; color: string }[] = [];
  const maxDist = PATCH * PATCH_RADIUS;
  for (let iz = -PATCH_RADIUS; iz <= PATCH_RADIUS; iz++) {
    for (let ix = -PATCH_RADIUS; ix <= PATCH_RADIUS; ix++) {
      const tx = px + ix;
      const tz = pz + iz;
      const x0 = tx * PATCH;
      const z0 = tz * PATCH;
      const mid: Vec3 = [x0 + PATCH / 2, 0, z0 + PATCH / 2];
      const dist = Math.hypot(mid[0] - cam.pos[0], mid[2] - cam.pos[2]);
      if (dist > maxDist) continue;
      if (toCam(cam, mid)[2] < -PATCH) continue;
      const inset = 6 + hash(tx, tz) * 10;
      const poly = projectPoly(cam, quad(x0 + inset, z0 + inset, x0 + PATCH - inset, z0 + PATCH - inset, 0.02));
      if (!poly) continue;
      const colorBase = FIELD_COLORS[Math.floor(hash(tx + 31, tz - 17) * FIELD_COLORS.length)];
      const t = Math.pow(dist / maxDist, 1.4);
      const groundAtDist = mix(BASE_GROUND, HAZE, Math.min(0.75, (dist / maxDist) * 0.5));
      patches.push({ depth: poly.depth, screen: poly.screen, color: css(mix(colorBase, groundAtDist, t)) });
    }
  }
  patches.sort((a, b) => b.depth - a.depth);
  for (const p of patches) fillPoly(ctx, p.screen, p.color);

  const items: Item[] = [];
  for (const dest of input.destinations) {
    const c = navToWorld(dest.x, dest.y);
    if (Math.hypot(c[0] - cam.pos[0], c[2] - cam.pos[2]) > AIRPORT_RANGE) continue;
    drawAirport(ctx, cam, dest, input.buildingsFor(dest.id), items);
  }

  const shadowPt = projectPoint(cam, [planePos[0], 0.4, planePos[2]]);
  if (shadowPt && mode === "chase") {
    const alpha = Math.max(0.06, 0.38 - planePos[1] / 900);
    const sr = (19 / shadowPt.z) * cam.focal;
    ctx.fillStyle = `rgba(20,30,20,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(shadowPt.x, shadowPt.y, sr, sr * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const target = input.destinations.find((d) => d.id === input.targetId);
  if (target) drawBeacon(cam, target, items, input.distanceLabel);
  drawClouds(cam, items);

  items.sort((a, b) => b.depth - a.depth);
  for (const it of items) it.draw(ctx);

  if (mode === "chase") drawPlane(ctx, cam, planePos, planeBasis);

  if (input.tint !== "normal") {
    ctx.fillStyle = input.tint === "approach" ? "rgba(255,190,80,0.08)" : "rgba(255,150,60,0.14)";
    ctx.fillRect(0, 0, w, h);
  }

  if (mode === "cockpit") drawCockpitFrame(ctx, w, h, craft);
}

function drawCockpitFrame(ctx: CanvasRenderingContext2D, w: number, h: number, craft: FlightCraft) {
  ctx.save();
  ctx.fillStyle = "#1a1d22";
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, h * 0.78);
  ctx.quadraticCurveTo(w / 2, h * 0.7, w, h * 0.78);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#c8282a";
  ctx.fillRect(w / 2 - w * 0.06, h * 0.73, w * 0.12, h * 0.02);
  ctx.strokeStyle = "#2a2e35";
  ctx.lineWidth = Math.max(6, w * 0.012);
  ctx.beginPath();
  ctx.moveTo(w * 0.18, h * 0.78);
  ctx.lineTo(w * 0.3, 0);
  ctx.moveTo(w * 0.82, h * 0.78);
  ctx.lineTo(w * 0.7, 0);
  ctx.stroke();
  const cx = w / 2;
  const cy = h * 0.46;
  ctx.strokeStyle = "rgba(120,255,160,0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 28, cy);
  ctx.lineTo(cx - 8, cy);
  ctx.lineTo(cx, cy + 8);
  ctx.lineTo(cx + 8, cy);
  ctx.lineTo(cx + 28, cy);
  ctx.stroke();
  ctx.translate(cx, cy);
  ctx.rotate((-craft.bank * Math.PI) / 180);
  for (let p = -20; p <= 20; p += 10) {
    if (p === 0) continue;
    const y = (craft.pitch - p) * 4;
    ctx.beginPath();
    ctx.moveTo(-40, y);
    ctx.lineTo(40, y);
    ctx.strokeStyle = "rgba(120,255,160,0.35)";
    ctx.stroke();
  }
  ctx.restore();
}
