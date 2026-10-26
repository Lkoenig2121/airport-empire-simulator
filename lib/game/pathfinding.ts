import { cellKey, inBounds } from "./iso";
import { MAP_SIZE } from "./types";

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

export function findPath(
  walkable: Set<string>,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
): { x: number; y: number }[] {
  const sx = Math.round(startX);
  const sy = Math.round(startY);
  const gx = Math.round(goalX);
  const gy = Math.round(goalY);
  const start = cellKey(sx, sy);
  const goal = cellKey(gx, gy);

  if (start === goal) return [{ x: gx, y: gy }];
  if (!walkable.has(goal)) return straight(sx, sy, gx, gy);

  const open: string[] = [start];
  const came = new Map<string, string>();
  const gScore = new Map<string, number>([[start, 0]]);
  const fScore = new Map<string, number>([[start, heuristic(sx, sy, gx, gy)]]);
  const seen = new Set<string>();

  while (open.length) {
    let bestI = 0;
    let bestF = Infinity;
    for (let i = 0; i < open.length; i++) {
      const f = fScore.get(open[i]) ?? Infinity;
      if (f < bestF) {
        bestF = f;
        bestI = i;
      }
    }
    const current = open.splice(bestI, 1)[0];
    if (current === goal) return reconstruct(came, current);

    seen.add(current);
    const [cx, cy] = current.split(",").map(Number);
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      const nk = cellKey(nx, ny);
      if (!inBounds(nx, ny) || !walkable.has(nk) || seen.has(nk)) continue;
      const tentative = (gScore.get(current) ?? Infinity) + 1;
      if (tentative >= (gScore.get(nk) ?? Infinity)) continue;
      came.set(nk, current);
      gScore.set(nk, tentative);
      fScore.set(nk, tentative + heuristic(nx, ny, gx, gy));
      if (!open.includes(nk)) open.push(nk);
    }

    if (seen.size > MAP_SIZE * MAP_SIZE) break;
  }

  return straight(sx, sy, gx, gy);
}

function heuristic(ax: number, ay: number, bx: number, by: number) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function reconstruct(came: Map<string, string>, current: string) {
  const path = [current];
  while (came.has(current)) {
    current = came.get(current)!;
    path.push(current);
  }
  path.reverse();
  return path.map((k) => {
    const [x, y] = k.split(",").map(Number);
    return { x, y };
  });
}

function straight(sx: number, sy: number, gx: number, gy: number) {
  const path: { x: number; y: number }[] = [];
  let x = sx;
  let y = sy;
  while (x !== gx || y !== gy) {
    if (x !== gx) x += Math.sign(gx - x);
    else y += Math.sign(gy - y);
    path.push({ x, y });
  }
  return path.length ? path : [{ x: gx, y: gy }];
}
