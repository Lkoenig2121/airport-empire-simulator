import { AIRLINE_BY_ID, BUILD_BY_ID, categoryLabel } from "./catalog";
import { occupiedMap } from "./simulation";
import { inBounds } from "./iso";
import type { Aircraft, Building, Flight, Inspection, Passenger } from "./types";

export const GROUND_INFO = {
  name: "Grass field",
  category: "Landside",
  description: "Open, undeveloped ground on the airfield.",
  purpose:
    "Buildable land. Place runways, terminals, roads, and shops here to grow the airport. People can cross it, but it has no real facilities.",
  capacity: { people: 4, aircraft: 0 },
};

export function insideBuilding(b: Building, x: number, y: number) {
  return x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
}

export function occupantsAt(
  x: number,
  y: number,
  w: number,
  h: number,
  passengers: Passenger[],
  aircraft: Aircraft[],
) {
  const people = passengers.filter(
    (p) => p.x >= x && p.x < x + w && p.y >= y && p.y < y + h,
  ).length;
  const planes = aircraft.filter(
    (a) => a.x >= x - 0.4 && a.x < x + w + 0.4 && a.y >= y - 0.4 && a.y < y + h + 0.4,
  ).length;
  return { people, planes };
}

export function resolveInspect(
  x: number,
  y: number,
  buildings: Building[],
  aircraft: Aircraft[],
): Inspection | null {
  const nearPlane = aircraft.find(
    (a) => a.controlledBy !== "player" && Math.hypot(a.x - x, a.y - y) < 1.15,
  );
  if (nearPlane) return { kind: "aircraft", id: nearPlane.id };
  const hit = occupiedMap(buildings).get(`${x},${y}`);
  if (hit) return { kind: "building", id: hit.id };
  if (inBounds(x, y)) return { kind: "ground", x, y };
  return null;
}

export function inspectSummary(
  inspect: Inspection,
  buildings: Building[],
  passengers: Passenger[],
  aircraft: Aircraft[],
  flights: Flight[],
) {
  if (inspect.kind === "ground") {
    const occ = occupantsAt(inspect.x, inspect.y, 1, 1, passengers, aircraft);
    return {
      title: GROUND_INFO.name,
      kicker: GROUND_INFO.category,
      description: GROUND_INFO.description,
      purpose: GROUND_INFO.purpose,
      size: "1×1",
      cost: "Buildable plot",
      people: { current: occ.people, max: GROUND_INFO.capacity.people },
      aircraft: { current: occ.planes, max: GROUND_INFO.capacity.aircraft },
      extra: `Plot ${inspect.x}, ${inspect.y}`,
    };
  }

  if (inspect.kind === "building") {
    const building = buildings.find((b) => b.id === inspect.id);
    if (!building) return null;
    const def = BUILD_BY_ID[building.type];
    const occ = occupantsAt(building.x, building.y, building.w, building.h, passengers, aircraft);
    const parked = aircraft.find((a) => insideBuilding(building, a.x + 0.5, a.y + 0.5));
    const flight = parked ? flights.find((f) => f.id === parked.flightId) : null;
    const extra = flight
      ? `${flight.flightNo} · ${flight.passengers} booked passengers`
      : `${def.w}×${def.h} ${categoryLabel(def.category).toLowerCase()} facility`;
    return {
      title: def.name,
      kicker: categoryLabel(def.category),
      description: def.description,
      purpose: def.purpose,
      size: `${building.w}×${building.h}`,
      cost: `$${def.cost.toLocaleString()} to build`,
      people: { current: occ.people, max: def.capacity.people },
      aircraft: { current: occ.planes, max: def.capacity.aircraft },
      extra,
    };
  }

  const plane = aircraft.find((a) => a.id === inspect.id);
  if (!plane) return null;
  const flight = flights.find((f) => f.id === plane.flightId);
  const airline = AIRLINE_BY_ID[plane.airlineId];
  const booked = flight?.passengers ?? 0;
  return {
    title: flight?.flightNo ?? "Aircraft",
    kicker: airline?.name ?? "Airline",
    description: `${flight?.origin ?? "—"} → ${flight?.destination ?? "—"}`,
    purpose:
      "A live aircraft on the field. Click Pilot Aircraft to take the cockpit, or leave it to the airline AI to approach, land, taxi, and depart.",
    size: plane.state.replace("-", " "),
    cost: flight?.kind === "arrival" ? "Inbound service" : "Outbound service",
    people: { current: booked, max: Math.max(booked, 72) },
    aircraft: { current: 1, max: 1 },
    extra: `Status: ${plane.state.replace("-", " ")}`,
  };
}
