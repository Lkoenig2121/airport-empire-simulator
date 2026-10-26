import { AIRLINE_BY_ID, BUILD_BY_ID, CITIES, STAFF_ROLES } from "./catalog";
import { cellKey, cellsOf, inBounds, uid } from "./iso";
import { findPath } from "./pathfinding";
import type {
  Airline,
  Aircraft,
  Building,
  BuildId,
  Flight,
  GameState,
  LedgerEntry,
  Notice,
  Passenger,
  StaffMember,
  StaffRole,
  Stats,
} from "./types";
import { MAP_SIZE } from "./types";

const PAX_WALKABLE = new Set<BuildId>([
  "road",
  "parking",
  "terminal",
  "gate",
  "cafe",
  "shop",
  "security",
]);
const PLANE_WALKABLE = new Set<BuildId>(["runway", "taxiway", "gate"]);

export function occupiedMap(buildings: Building[]) {
  const map = new Map<string, Building>();
  for (const b of buildings) {
    for (const c of cellsOf(b.x, b.y, b.w, b.h)) {
      map.set(cellKey(c.x, c.y), b);
    }
  }
  return map;
}

export function footprint(type: BuildId, rotate: boolean) {
  const def = BUILD_BY_ID[type];
  return rotate ? { w: def.h, h: def.w } : { w: def.w, h: def.h };
}

export function canPlace(
  buildings: Building[],
  type: BuildId,
  x: number,
  y: number,
  rotate: boolean,
) {
  const { w, h } = footprint(type, rotate);
  if (!inBounds(x, y, w, h)) return false;
  const occ = occupiedMap(buildings);
  return cellsOf(x, y, w, h).every((c) => !occ.has(cellKey(c.x, c.y)));
}

export function placementCost(type: BuildId, w: number, h: number) {
  const def = BUILD_BY_ID[type];
  return def.paint ? def.cost * w * h : def.cost;
}

export function countType(buildings: Building[], type: BuildId) {
  return buildings.filter((b) => b.type === type).length;
}

export function isOperational(buildings: Building[]) {
  return countType(buildings, "runway") > 0 && countType(buildings, "terminal") > 0;
}

function walkableSet(buildings: Building[], kinds: Set<BuildId>) {
  const set = new Set<string>();
  for (const b of buildings) {
    if (!kinds.has(b.type)) continue;
    for (const c of cellsOf(b.x, b.y, b.w, b.h)) set.add(cellKey(c.x, c.y));
  }
  return set;
}

function buildingCenter(b: Building) {
  return { x: b.x + b.w / 2 - 0.5, y: b.y + b.h / 2 - 0.5 };
}

function nearest(buildings: Building[], type: BuildId, x: number, y: number) {
  let best: Building | null = null;
  let bestD = Infinity;
  for (const b of buildings) {
    if (b.type !== type) continue;
    const c = buildingCenter(b);
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
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

function pickCity(tier: Airline["tier"], airportName: string, kind: Flight["kind"]) {
  const list = CITIES[tier];
  const city = list[Math.floor(Math.random() * list.length)];
  return kind === "arrival"
    ? { origin: city, destination: airportName }
    : { origin: airportName, destination: city };
}

function pushLedger(
  ledger: LedgerEntry[],
  minutes: number,
  label: string,
  amount: number,
) {
  ledger.unshift({ id: uid("led"), minutes, label, amount });
  if (ledger.length > 40) ledger.length = 40;
}

function pushNotice(
  notices: Notice[],
  kind: Notice["kind"],
  title: string,
  body: string,
) {
  notices.unshift({ id: uid("note"), kind, title, body, at: Date.now() });
  if (notices.length > 5) notices.length = 5;
}

export function hireStaff(role: StaffRole): StaffMember {
  const meta = STAFF_ROLES[role];
  const first = meta.firstNames[Math.floor(Math.random() * meta.firstNames.length)];
  const last = ["Cole", "Park", "Nguyen", "Reyes", "Shah", "Brooks", "Khan", "Diaz"][
    Math.floor(Math.random() * 8)
  ];
  return {
    id: uid("st"),
    name: `${first} ${last}`,
    role,
    wagePerDay: meta.wagePerDay,
  };
}

export function staffingNeeds(buildings: Building[]) {
  return {
    agent: countType(buildings, "terminal") * 2,
    security: countType(buildings, "terminal") + countType(buildings, "security"),
    handler: countType(buildings, "gate"),
    ground: countType(buildings, "runway"),
    maintenance: buildings.length > 0 ? 1 + countType(buildings, "hangar") : 0,
  } satisfies Record<StaffRole, number>;
}

function staffFill(staff: StaffMember[], buildings: Building[]) {
  const needs = staffingNeeds(buildings);
  const have: Record<StaffRole, number> = {
    agent: 0,
    security: 0,
    handler: 0,
    ground: 0,
    maintenance: 0,
  };
  for (const s of staff) have[s.role] += 1;
  let met = 0;
  let total = 0;
  for (const role of Object.keys(needs) as StaffRole[]) {
    total += needs[role];
    met += Math.min(have[role], needs[role]);
  }
  return total === 0 ? 1 : met / total;
}

export function computeRating(state: Pick<GameState, "buildings" | "staff" | "stats">) {
  const { buildings, staff } = state;
  if (!isOperational(buildings)) return 0;
  let rating = 58;
  rating += Math.min(12, countType(buildings, "gate") * 4);
  rating += countType(buildings, "cafe") || countType(buildings, "shop") ? 6 : 0;
  rating += countType(buildings, "hangar") ? 5 : 0;
  rating += countType(buildings, "security") ? 6 : 0;
  rating += countType(buildings, "parking") ? 3 : 0;
  rating += Math.round(staffFill(staff, buildings) * 16);
  rating -= Math.max(0, state.stats.passengersToday / 80 - countType(buildings, "gate") * 2);
  return Math.max(12, Math.min(99, Math.round(rating)));
}

function occupiedGates(aircraft: Aircraft[], flights: Flight[]) {
  const used = new Set<string>();
  for (const f of flights) {
    if (f.gateId && f.status !== "departed" && f.status !== "cancelled") {
      used.add(f.gateId);
    }
  }
  for (const a of aircraft) {
    if (a.state === "parked" || a.state === "taxi-in") {
      const f = flights.find((fl) => fl.id === a.flightId);
      if (f?.gateId) used.add(f.gateId);
    }
  }
  return used;
}

function freeGate(buildings: Building[], aircraft: Aircraft[], flights: Flight[]) {
  const used = occupiedGates(aircraft, flights);
  return buildings.find((b) => b.type === "gate" && !used.has(b.id)) ?? null;
}

function spawnFlight(state: GameState, airlineId: string, minutes: number): Flight {
  const airline = AIRLINE_BY_ID[airlineId];
  const first = state.flights.length === 0;
  const kind: Flight["kind"] = first || Math.random() > 0.45 ? "arrival" : "departure";
  const cities = pickCity(airline.tier, state.airportName, kind);
  const pax =
    airline.tier === "regional"
      ? 22 + Math.floor(Math.random() * 36)
      : 48 + Math.floor(Math.random() * 80);
  return {
    id: uid("fl"),
    flightNo: `${airline.code} ${200 + Math.floor(Math.random() * 700)}`,
    airlineId,
    ...cities,
    kind,
    status: "scheduled",
    scheduledMin: minutes + (first ? 8 : 18 + Math.floor(Math.random() * 70)),
    passengers: pax,
    aircraftId: null,
    gateId: null,
  };
}

function makeAircraft(
  flight: Flight,
  runway: Building,
  gate: Building | null,
  _buildings: Building[],
): Aircraft {
  const { alongX, points } = runwayLane(runway);
  const start = points[0];
  const end = points[points.length - 1];
  const approach = alongX
    ? { x: start.x - 7, y: start.y }
    : { x: start.x, y: start.y - 7 };

  if (flight.kind === "arrival") {
    return {
      id: uid("ac"),
      flightId: flight.id,
      airlineId: flight.airlineId,
      x: approach.x,
      y: approach.y,
      heading: alongX ? 0 : Math.PI / 2,
      state: "approach",
      path: [start, ...points.slice(1)],
      wait: 0,
    };
  }

  const park = gate ? buildingCenter(gate) : end;
  return {
    id: uid("ac"),
    flightId: flight.id,
    airlineId: flight.airlineId,
    x: park.x,
    y: park.y,
    heading: 0,
    state: "parked",
    path: [],
    wait: 10,
  };
}

function spawnPassengers(
  flight: Flight,
  from: { x: number; y: number },
  to: { x: number; y: number },
  buildings: Building[],
  kind: Passenger["kind"],
) {
  const walk = walkableSet(buildings, PAX_WALKABLE);
  const count = Math.min(8, Math.max(3, Math.round(flight.passengers / 8)));
  const spawned: Passenger[] = [];
  for (let i = 0; i < count; i++) {
    const jitter = { x: from.x + (Math.random() - 0.5) * 0.8, y: from.y + (Math.random() - 0.5) * 0.8 };
    const path = findPath(walk, jitter.x, jitter.y, to.x, to.y);
    spawned.push({
      id: uid("pax"),
      x: jitter.x,
      y: jitter.y,
      path,
      color: [0xf4d35e, 0xee6c4d, 0x7eb8da, 0xf7f7ff, 0xc9ada7, 0x90be6d][i % 6],
      kind,
      spent: false,
    });
  }
  return spawned;
}

function landsideSpawn(buildings: Building[]) {
  const parking = buildings.find((b) => b.type === "parking");
  if (parking) return buildingCenter(parking);
  const road = buildings.find((b) => b.type === "road");
  if (road) return { x: road.x, y: road.y };
  return { x: MAP_SIZE / 2, y: MAP_SIZE - 2 };
}

function maybeUnlockAirlines(state: GameState, notices: Notice[]) {
  const unlocked = [...state.unlockedAirlines];
  const buildings = state.buildings;
  if (
    !unlocked.includes("horizon") &&
    isOperational(buildings)
  ) {
    unlocked.push("horizon");
    pushNotice(
      notices,
      "success",
      "Airline signed",
      "Horizon Air will begin regional service.",
    );
  }
  if (
    !unlocked.includes("summit") &&
    countType(buildings, "gate") >= 2 &&
    countType(buildings, "hangar") >= 1 &&
    state.stats.rating >= 70
  ) {
    unlocked.push("summit");
    pushNotice(
      notices,
      "success",
      "National carrier",
      "Summit Express awarded you a contract.",
    );
  }
  return unlocked;
}

function moveAlong(
  entity: { x: number; y: number; heading?: number; path: { x: number; y: number }[] },
  speed: number,
  dtMin: number,
) {
  if (!entity.path.length) return true;
  const target = entity.path[0];
  const dx = target.x - entity.x;
  const dy = target.y - entity.y;
  const dist = Math.hypot(dx, dy);
  const step = speed * dtMin;
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

export function advanceSimulation(state: GameState, dtSec: number): Partial<GameState> {
  if (state.speed === 0 || state.welcome) return {};

  const dtMin = dtSec * state.speed * 2;
  const minutes = state.minutes + dtMin;
  const buildings = state.buildings;
  const notices = [...state.notices];
  const ledger = [...state.ledger];
  let cash = state.cash;
  const stats: Stats = { ...state.stats };
  const flights = state.flights.map((f) => ({ ...f }));
  const aircraft = state.aircraft.map((a) => ({ ...a, path: a.path.map((p) => ({ ...p })) }));
  const passengers = state.passengers.map((p) => ({ ...p, path: p.path.map((n) => ({ ...n })) }));
  const staff = state.staff;

  const prevHour = Math.floor(state.minutes / 60);
  const nextHour = Math.floor(minutes / 60);
  if (nextHour > prevHour && staff.length) {
    const hourly = staff.reduce((s, m) => s + m.wagePerDay / 24, 0);
    const maint = buildings.length * 3.2;
    const cost = hourly + maint;
    cash -= cost;
    stats.expensesToday += cost;
    pushLedger(ledger, minutes, "Wages & upkeep", -cost);
  }

  const prevDay = Math.floor(state.minutes / 1440);
  const nextDay = Math.floor(minutes / 1440);
  if (nextDay > prevDay) {
    stats.passengersToday = 0;
    stats.flightsToday = 0;
    stats.revenueToday = 0;
    stats.expensesToday = 0;
    pushNotice(notices, "info", `Day ${nextDay + 1}`, "A new operating day has begun.");
  }

  const unlocked = maybeUnlockAirlines({ ...state, stats }, notices);

  if (isOperational(buildings) && unlocked.length) {
    const live = flights.filter((f) => f.status !== "departed" && f.status !== "cancelled");
    if (live.length < 4) {
      const airlineId = unlocked[Math.floor(Math.random() * unlocked.length)];
      flights.push(spawnFlight({ ...state, unlockedAirlines: unlocked }, airlineId, minutes));
    }
  }

  const taxi = walkableSet(buildings, PLANE_WALKABLE);
  const runway = buildings.find((b) => b.type === "runway") ?? null;

  for (const flight of flights) {
    if (flight.status !== "scheduled" || minutes < flight.scheduledMin || !runway) continue;
    const gate = freeGate(buildings, aircraft, flights);
    const plane = makeAircraft(flight, runway, gate, buildings);
    flight.aircraftId = plane.id;
    flight.gateId = gate?.id ?? null;
    flight.status = flight.kind === "arrival" ? "inbound" : "boarding";
    aircraft.push(plane);

    if (flight.kind === "departure") {
      const from = landsideSpawn(buildings);
      const to = gate ? buildingCenter(gate) : buildingCenter(runway);
      const term = nearest(buildings, "terminal", from.x, from.y);
      const via = term ? buildingCenter(term) : to;
      const firstLeg = spawnPassengers(flight, from, via, buildings, "departing");
      passengers.push(...firstLeg);
    }
  }

  for (const plane of aircraft) {
    const flight = flights.find((f) => f.id === plane.flightId);
    if (!flight || !runway) continue;
    const { points } = runwayLane(runway);
    const start = points[0];
    const end = points[points.length - 1];
    const gate = flight.gateId
      ? buildings.find((b) => b.id === flight.gateId) ?? null
      : null;

    if (plane.state === "parked") {
      plane.wait -= dtMin;
      if (plane.wait <= 0) {
        if (flight.kind === "arrival") {
          flight.status = "boarding";
          plane.state = "taxi-out";
          plane.path = findPath(
            taxi,
            plane.x,
            plane.y,
            start.x,
            start.y,
          );
        } else {
          flight.status = "taxiing";
          plane.state = "taxi-out";
          plane.path = findPath(taxi, plane.x, plane.y, start.x, start.y);
        }
      }
      continue;
    }

    const air = plane.state === "approach" || plane.state === "takeoff";
    const arrived = moveAlong(plane, air ? 2.6 : 0.95, dtMin);

    if (!arrived) continue;

    if (plane.state === "approach") {
      plane.state = "landing";
      flight.status = "landing";
      plane.path = points.slice();
    } else if (plane.state === "landing") {
      const fee = 2800 + flight.passengers * 12;
      cash += fee;
      stats.revenueToday += fee;
      stats.flightsToday += 1;
      stats.passengersToday += flight.passengers;
      stats.passengersTotal += flight.passengers;
      pushLedger(ledger, minutes, `${flight.flightNo} landing fees`, fee);
      pushNotice(notices, "money", `${flight.flightNo} landed`, `${flight.passengers} passengers on board.`);

      const dest = gate ? buildingCenter(gate) : end;
      plane.path = findPath(taxi, plane.x, plane.y, dest.x, dest.y);
      plane.state = "taxi-in";
      flight.status = "taxiing";

      const exit = landsideSpawn(buildings);
      const from = dest;
      passengers.push(...spawnPassengers(flight, from, exit, buildings, "arriving"));
    } else if (plane.state === "taxi-in") {
      plane.state = "parked";
      plane.wait = 14 + flight.passengers * 0.08;
      flight.status = "at-gate";
    } else if (plane.state === "taxi-out") {
      plane.state = "takeoff";
      flight.status = "departed";
      const beyond =
        runway.w >= runway.h
          ? { x: end.x + 8, y: end.y }
          : { x: end.x, y: end.y + 8 };
      plane.path = [...points, beyond];
      const fare = flight.kind === "departure" ? flight.passengers * 36 : flight.passengers * 18;
      cash += fare;
      stats.revenueToday += fare;
      if (flight.kind === "departure") {
        stats.flightsToday += 1;
        stats.passengersToday += flight.passengers;
        stats.passengersTotal += flight.passengers;
      }
      pushLedger(ledger, minutes, `${flight.flightNo} passenger revenue`, fare);
    } else if (plane.state === "takeoff") {
      plane.state = "gone";
    }
  }

  const shops = buildings.filter((b) => b.type === "cafe" || b.type === "shop");
  for (const pax of passengers) {
    const done = moveAlong(pax, 1.35, dtMin);
    if (!pax.spent && shops.length) {
      for (const shop of shops) {
        if (
          pax.x >= shop.x - 0.2 &&
          pax.x <= shop.x + shop.w + 0.2 &&
          pax.y >= shop.y - 0.2 &&
          pax.y <= shop.y + shop.h + 0.2
        ) {
          const sale = shop.type === "cafe" ? 9.5 : 16;
          cash += sale;
          stats.revenueToday += sale;
          pax.spent = true;
          pushLedger(ledger, minutes, shop.type === "cafe" ? "Cafe sale" : "Retail sale", sale);
          break;
        }
      }
    }
    if (done) pax.path = [];
  }

  const liveAircraft = aircraft.filter((a) => a.state !== "gone");
  const livePassengers = passengers.filter((p) => p.path.length > 0 || Math.random() > 0.002);
  const liveFlights = flights.filter((f) => {
    if (f.status === "departed") {
      const plane = liveAircraft.find((a) => a.flightId === f.id);
      return Boolean(plane);
    }
    return f.status !== "cancelled";
  });

  stats.rating = computeRating({ buildings, staff, stats });

  return {
    minutes,
    cash,
    stats,
    flights: liveFlights,
    aircraft: liveAircraft,
    passengers: livePassengers.filter((p) => p.path.length > 0),
    ledger,
    notices,
    unlockedAirlines: unlocked,
  };
}
