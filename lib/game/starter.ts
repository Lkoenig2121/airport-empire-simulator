import { hireStaff } from "./simulation";
import type { Aircraft, Building, Flight, GameState, Notice, StaffMember } from "./types";

function tile(type: Building["type"], x: number, y: number, w = 1, h = 1): Building {
  return { id: `${type}_${x}_${y}`, type, x, y, w, h };
}

function strip(type: Building["type"], x0: number, y0: number, x1: number, y1: number) {
  const tiles: Building[] = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      tiles.push(tile(type, x, y));
    }
  }
  return tiles;
}

export const STARTER_RUNWAY = tile("runway", 6, 10, 12, 2);
export const STARTER_GATE = tile("gate", 16, 15, 2, 2);

export function starterBuildings(): Building[] {
  return [
    STARTER_RUNWAY,
    ...strip("taxiway", 6, 12, 17, 12),
    ...strip("taxiway", 16, 13, 17, 14),
    STARTER_GATE,
    tile("terminal", 18, 15, 4, 3),
    tile("security", 22, 15, 2, 2),
    tile("parking", 18, 22, 3, 2),
    ...strip("road", 19, 18, 19, 21),
    tile("road", 18, 21),
    tile("road", 20, 21),
  ];
}

export function starterStaff(): StaffMember[] {
  return [
    hireStaff("agent"),
    hireStaff("agent"),
    hireStaff("security"),
    hireStaff("handler"),
    hireStaff("ground"),
    hireStaff("maintenance"),
  ];
}

export function starterOpeningService(airportName: string): {
  flights: Flight[];
  aircraft: Aircraft[];
} {
  const flight: Flight = {
    id: "fl_opening",
    flightNo: "HA 214",
    airlineId: "horizon",
    origin: "Cedar Falls Metro",
    destination: airportName,
    kind: "arrival",
    status: "inbound",
    scheduledMin: 6 * 60,
    passengers: 38,
    aircraftId: "ac_opening",
    gateId: STARTER_GATE.id,
  };

  const lane = Array.from({ length: 12 }, (_, i) => ({ x: 6 + i, y: 10.5 }));
  const aircraft: Aircraft = {
    id: "ac_opening",
    flightId: flight.id,
    airlineId: "horizon",
    x: -8,
    y: 10.5,
    heading: 0,
    alt: 10,
    state: "approach",
    path: lane,
    wait: 0,
  };

  return { flights: [flight], aircraft: [aircraft] };
}

export function starterNotices(): Notice[] {
  return [
    {
      id: "intro",
      kind: "success",
      title: "Regional field online",
      body: "Runway, taxiway, gate, and terminal are ready. Horizon Air is inbound.",
      at: Date.now(),
    },
  ];
}

export function starterSlice(airportName: string): Pick<
  GameState,
  | "buildings"
  | "staff"
  | "flights"
  | "aircraft"
  | "unlockedAirlines"
  | "notices"
  | "stats"
> {
  const opening = starterOpeningService(airportName);
  return {
    buildings: starterBuildings(),
    staff: starterStaff(),
    flights: opening.flights,
    aircraft: opening.aircraft,
    unlockedAirlines: ["horizon"],
    notices: starterNotices(),
    stats: {
      passengersToday: 0,
      passengersTotal: 0,
      flightsToday: 0,
      revenueToday: 0,
      expensesToday: 0,
      rating: 74,
    },
  };
}
