import { AIRLINES } from "./catalog";
import { BUILD_BY_ID } from "./catalog";
import { cellKey, cellsOf, inBounds, uid } from "./iso";
import { findPath } from "./pathfinding";
import type { Aircraft, Building, BuildId, Passenger } from "./types";
import { HOME_AIRPORT_ID } from "../flight/types";
import { DESTINATION_BY_ID } from "../flight/destinations";

const PAX_WALK = new Set<BuildId>(["road", "parking", "terminal", "gate", "cafe", "shop", "security"]);
const PLANE_WALK = new Set<BuildId>(["runway", "taxiway", "gate"]);

function layout(prefix: string) {
  const occ = new Set<string>();
  const buildings: Building[] = [];

  const add = (type: BuildId, x: number, y: number, w?: number, h?: number) => {
    const def = BUILD_BY_ID[type];
    const bw = w ?? def.w;
    const bh = h ?? def.h;
    if (!inBounds(x, y, bw, bh)) return false;
    const cells = cellsOf(x, y, bw, bh);
    if (cells.some((c) => occ.has(cellKey(c.x, c.y)))) return false;
    for (const c of cells) occ.add(cellKey(c.x, c.y));
    buildings.push({ id: `${prefix}_${type}_${x}_${y}`, type, x, y, w: bw, h: bh });
    return true;
  };

  const fill = (type: BuildId, x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) add(type, x, y, 1, 1);
    }
  };

  return { add, fill, buildings };
}

function cedarFalls() {
  const { add, fill, buildings } = layout("cfm");
  add("runway", 1, 8, 20, 2);
  add("hangar", 1, 13);
  add("hangar", 5, 13);
  fill("taxiway", 1, 10, 24, 11);
  fill("taxiway", 16, 12, 24, 15);
  fill("taxiway", 1, 12, 4, 16);
  add("gate", 16, 16);
  add("gate", 18, 16);
  add("gate", 20, 16);
  add("gate", 22, 16);
  add("terminal", 16, 19);
  add("terminal", 21, 19);
  add("security", 26, 19);
  add("cafe", 16, 23);
  add("shop", 19, 23);
  add("cafe", 22, 23);
  add("parking", 16, 28);
  add("parking", 20, 28);
  add("parking", 24, 28);
  fill("road", 17, 26, 17, 27);
  fill("road", 21, 26, 21, 27);
  fill("road", 16, 26, 25, 26);
  return buildings;
}

function chicago() {
  const { add, fill, buildings } = layout("cls");
  add("runway", 0, 2, 22, 2);
  add("runway", 0, 32, 22, 2);
  add("hangar", 0, 6);
  add("hangar", 0, 10);
  add("hangar", 0, 25);
  fill("taxiway", 0, 4, 24, 5);
  fill("taxiway", 0, 30, 24, 31);
  fill("taxiway", 23, 4, 24, 31);
  fill("taxiway", 25, 6, 25, 22);
  fill("taxiway", 0, 6, 2, 10);
  add("gate", 26, 6);
  add("gate", 26, 9);
  add("gate", 26, 12);
  add("gate", 26, 15);
  add("gate", 26, 18);
  add("gate", 26, 21);
  add("terminal", 29, 6);
  add("terminal", 29, 12);
  add("terminal", 29, 18);
  add("security", 33, 6);
  add("security", 33, 18);
  add("cafe", 29, 22);
  add("shop", 32, 22);
  add("cafe", 29, 24);
  add("shop", 32, 24);
  add("parking", 26, 26);
  add("parking", 30, 26);
  add("parking", 26, 29);
  add("parking", 30, 29);
  fill("road", 28, 25, 28, 25);
  fill("road", 27, 25, 32, 25);
  return buildings;
}

function denver() {
  const { add, fill, buildings } = layout("dhp");
  add("runway", 1, 16, 24, 2);
  add("runway", 1, 20, 24, 2);
  fill("taxiway", 1, 18, 26, 19);
  fill("taxiway", 25, 8, 26, 24);
  fill("taxiway", 8, 8, 24, 9);
  add("gate", 8, 10);
  add("gate", 11, 10);
  add("gate", 14, 10);
  add("gate", 17, 10);
  add("gate", 20, 10);
  add("terminal", 8, 4);
  add("terminal", 13, 4);
  add("terminal", 18, 4);
  add("security", 23, 4);
  add("hangar", 1, 8);
  add("hangar", 1, 12);
  add("hangar", 1, 23);
  add("cafe", 8, 13);
  add("shop", 11, 13);
  add("cafe", 14, 13);
  add("parking", 8, 0);
  add("parking", 12, 0);
  add("parking", 16, 0);
  fill("road", 9, 2, 18, 3);
  add("shop", 17, 13);
  return buildings;
}

function london() {
  const { add, fill, buildings } = layout("lcr");
  add("runway", 0, 1, 26, 2);
  add("runway", 0, 33, 26, 2);
  add("hangar", 0, 6);
  add("hangar", 0, 10);
  add("hangar", 0, 14);
  add("hangar", 0, 24);
  fill("taxiway", 0, 3, 28, 4);
  fill("taxiway", 0, 31, 28, 32);
  fill("taxiway", 27, 3, 28, 32);
  fill("taxiway", 29, 5, 29, 27);
  fill("taxiway", 4, 5, 6, 12);
  add("gate", 30, 5);
  add("gate", 30, 8);
  add("gate", 30, 11);
  add("gate", 30, 14);
  add("gate", 30, 17);
  add("gate", 30, 20);
  add("gate", 30, 23);
  add("gate", 30, 26);
  add("terminal", 32, 5);
  add("terminal", 32, 11);
  add("terminal", 32, 17);
  add("terminal", 32, 23);
  add("security", 32, 9);
  add("security", 32, 21);
  add("cafe", 32, 28);
  add("shop", 34, 28);
  add("cafe", 32, 30);
  add("shop", 34, 30);
  add("parking", 20, 6);
  add("parking", 20, 9);
  add("parking", 20, 12);
  add("parking", 20, 15);
  fill("road", 23, 6, 23, 18);
  fill("road", 20, 18, 31, 18);
  return buildings;
}

export const HUB_LAYOUTS: Record<string, Building[]> = {
  "cedar-falls": cedarFalls(),
  chicago: chicago(),
  denver: denver(),
  london: london(),
};

export function isHomeAirport(id: string | null | undefined) {
  return !id || id === HOME_AIRPORT_ID || DESTINATION_BY_ID[id]?.editable === true;
}

export function hubBuildings(id: string) {
  return HUB_LAYOUTS[id] ?? [];
}

function walkable(buildings: Building[], kinds: Set<BuildId>) {
  const set = new Set<string>();
  for (const b of buildings) {
    if (!kinds.has(b.type)) continue;
    for (const c of cellsOf(b.x, b.y, b.w, b.h)) set.add(cellKey(c.x, c.y));
  }
  return set;
}

function center(b: Building) {
  return { x: b.x + b.w / 2 - 0.5, y: b.y + b.h / 2 - 0.5 };
}

function runwayLane(runway: Building) {
  const alongX = runway.w >= runway.h;
  const points: { x: number; y: number }[] = [];
  if (alongX) {
    const y = runway.y + runway.h / 2 - 0.5;
    for (let x = runway.x; x < runway.x + runway.w; x++) points.push({ x, y });
  } else {
    const x = runway.x + runway.w / 2 - 0.5;
    for (let y = runway.y; y < runway.y + runway.h; y++) points.push({ x, y });
  }
  return { alongX, points };
}

export function parkOnAirport(plane: Aircraft, buildings: Building[]): Aircraft {
  const gate = buildings.find((b) => b.type === "gate");
  const runway = buildings.find((b) => b.type === "runway");
  const spot = gate ? center(gate) : runway ? runwayLane(runway).points[0] : { x: 10, y: 10 };
  return {
    ...plane,
    x: spot.x,
    y: spot.y,
    alt: 0,
    state: "parked",
    path: [],
    wait: 12,
    controlledBy: undefined,
  };
}

export function seedHubTraffic(hubId: string): { aircraft: Aircraft[]; passengers: Passenger[] } {
  const buildings = hubBuildings(hubId);
  const runways = buildings.filter((b) => b.type === "runway");
  const gates = buildings.filter((b) => b.type === "gate");
  const parking = buildings.find((b) => b.type === "parking");
  const terminal = buildings.find((b) => b.type === "terminal");
  const aircraft: Aircraft[] = [];
  const passengers: Passenger[] = [];
  const paxWalk = walkable(buildings, PAX_WALK);

  runways.forEach((runway, r) => {
    const { alongX, points } = runwayLane(runway);
    const start = points[0];
    const approach = alongX ? { x: start.x - 10, y: start.y } : { x: start.x, y: start.y - 10 };
    const airline = AIRLINES[Math.min(r + 1, AIRLINES.length - 1)];
    aircraft.push({
      id: `hub_${hubId}_in_${r}`,
      flightId: `hubfl_${hubId}_${r}`,
      airlineId: airline.id,
      x: approach.x,
      y: approach.y,
      heading: alongX ? 0 : Math.PI / 2,
      alt: 10,
      state: "approach",
      path: points.slice(),
      wait: 0,
    });
  });

  gates.slice(0, 5).forEach((gate, i) => {
    const c = center(gate);
    const airline = AIRLINES[i % AIRLINES.length];
    aircraft.push({
      id: `hub_${hubId}_gate_${i}`,
      flightId: `hubfl_${hubId}_g${i}`,
      airlineId: airline.id,
      x: c.x,
      y: c.y,
      heading: 0,
      alt: 0,
      state: "parked",
      path: [],
      wait: 6 + i * 4,
    });
  });

  if (parking && terminal) {
    const from = center(parking);
    const to = center(terminal);
    for (let i = 0; i < 10; i++) {
      const jitter = { x: from.x + (Math.random() - 0.5), y: from.y + (Math.random() - 0.5) };
      passengers.push({
        id: uid("hubpax"),
        x: jitter.x,
        y: jitter.y,
        path: findPath(paxWalk, jitter.x, jitter.y, to.x, to.y),
        color: [0xf4d35e, 0xee6c4d, 0x7eb8da, 0xf7f7ff, 0x90be6d][i % 5],
        kind: i % 2 === 0 ? "departing" : "arriving",
        spent: false,
      });
    }
  }

  return { aircraft, passengers };
}

function moveAlong(
  entity: { x: number; y: number; heading?: number; path: { x: number; y: number }[] },
  speed: number,
  dt: number,
) {
  if (!entity.path.length) return true;
  const target = entity.path[0];
  const dx = target.x - entity.x;
  const dy = target.y - entity.y;
  const dist = Math.hypot(dx, dy);
  const step = speed * dt;
  if (dist <= step || dist < 0.02) {
    entity.x = target.x;
    entity.y = target.y;
    entity.path.shift();
    return entity.path.length === 0;
  }
  entity.x += (dx / dist) * step;
  entity.y += (dy / dist) * step;
  if (entity.heading !== undefined) entity.heading = Math.atan2(dy, dx);
  return false;
}

export function advanceHubTraffic(
  hubId: string,
  aircraft: Aircraft[],
  passengers: Passenger[],
  dtSec: number,
) {
  const buildings = hubBuildings(hubId);
  const runway = buildings.find((b) => b.type === "runway");
  const taxi = walkable(buildings, PLANE_WALK);
  const dt = dtSec * 2;
  const nextAircraft = aircraft.map((a) => ({ ...a, path: a.path.map((p) => ({ ...p })) }));
  const nextPassengers = passengers.map((p) => ({ ...p, path: p.path.map((n) => ({ ...n })) }));

  if (runway) {
    const { points } = runwayLane(runway);
    const start = points[0];
    const end = points[points.length - 1];
    for (const plane of nextAircraft) {
      if (plane.controlledBy === "player") continue;
      if (plane.state === "parked") {
        plane.wait -= dt;
        if (plane.wait <= 0) {
          plane.state = "taxi-out";
          plane.path = findPath(taxi, plane.x, plane.y, start.x, start.y);
        }
        continue;
      }
      if (plane.state === "approach") plane.alt = Math.max(0, Math.min(12, Math.hypot(plane.x - start.x, plane.y - start.y) * 0.7));
      else if (plane.state === "takeoff") plane.alt = Math.min(16, (plane.alt ?? 0) + 0.8 * dt);
      else plane.alt = 0;
      const arrived = moveAlong(plane, plane.state === "approach" || plane.state === "takeoff" ? 1.6 : 0.95, dt);
      if (!arrived) continue;
      if (plane.state === "approach") {
        plane.state = "landing";
        plane.path = points.slice();
      } else if (plane.state === "landing") {
        const gate = buildings.find((b) => b.type === "gate");
        const dest = gate ? center(gate) : end;
        plane.state = "taxi-in";
        plane.path = findPath(taxi, plane.x, plane.y, dest.x, dest.y);
      } else if (plane.state === "taxi-in") {
        plane.state = "parked";
        plane.wait = 18;
      } else if (plane.state === "taxi-out") {
        plane.state = "takeoff";
        plane.path = [...points, { x: end.x + 16, y: end.y }];
      } else if (plane.state === "takeoff") {
        const { alongX } = runwayLane(runway);
        plane.state = "approach";
        plane.x = alongX ? start.x - 10 : start.x;
        plane.y = alongX ? start.y : start.y - 10;
        plane.alt = 11;
        plane.path = points.slice();
      }
    }
  }

  for (const pax of nextPassengers) {
    const done = moveAlong(pax, 1.2, dt);
    if (done) pax.path = [];
  }

  return {
    aircraft: nextAircraft.filter((a) => a.state !== "gone"),
    passengers: nextPassengers.filter((p) => p.path.length > 0 || Math.random() > 0.01),
  };
}
