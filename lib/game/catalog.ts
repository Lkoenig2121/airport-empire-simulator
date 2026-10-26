import type { Airline, BuildDef, StaffRole } from "./types";

export const BUILDINGS: BuildDef[] = [
  {
    id: "runway",
    name: "Runway",
    category: "airside",
    w: 12,
    h: 2,
    cost: 320_000,
    paint: false,
    description: "Required for landings and takeoffs. Orient with R.",
    purpose:
      "The active landing strip. Aircraft use it to arrive and depart. Only one movement should occupy the runway at a time.",
    capacity: { people: 0, aircraft: 1 },
  },
  {
    id: "taxiway",
    name: "Taxiway",
    category: "airside",
    w: 1,
    h: 1,
    cost: 8_000,
    paint: true,
    description: "Connects runways to gates. Click and drag to pave.",
    purpose:
      "Airside pavement that lets aircraft taxi between the runway and stands. Keep it connected or planes cannot reach the gate.",
    capacity: { people: 0, aircraft: 1 },
  },
  {
    id: "hangar",
    name: "Hangar",
    category: "airside",
    w: 3,
    h: 3,
    cost: 90_000,
    paint: false,
    description: "Maintenance bay. Improves rating and unlocks more flights.",
    purpose:
      "Overnight and turnaround maintenance. Raises reliability and helps unlock national carriers.",
    capacity: { people: 12, aircraft: 1 },
  },
  {
    id: "terminal",
    name: "Passenger Terminal",
    category: "terminal",
    w: 4,
    h: 3,
    cost: 220_000,
    paint: false,
    description: "Check-in hall and concourse. Needed to attract airlines.",
    purpose:
      "The passenger heart of the airport. Travelers check in, wait, and transfer through here before reaching a gate.",
    capacity: { people: 120, aircraft: 0 },
  },
  {
    id: "gate",
    name: "Aircraft Gate",
    category: "terminal",
    w: 2,
    h: 2,
    cost: 48_000,
    paint: false,
    description: "Jet bridge stand. Planes park here to board passengers.",
    purpose:
      "A parked aircraft stand with a jet bridge. Arrivals deplane here and departures board from this hold room.",
    capacity: { people: 80, aircraft: 1 },
  },
  {
    id: "security",
    name: "Security",
    category: "terminal",
    w: 2,
    h: 2,
    cost: 40_000,
    paint: false,
    description: "Checkpoint. Raises passenger rating when staffed.",
    purpose:
      "Screens departing passengers. A staffed checkpoint keeps queues moving and lifts the airport rating.",
    capacity: { people: 30, aircraft: 0 },
  },
  {
    id: "road",
    name: "Access Road",
    category: "landside",
    w: 1,
    h: 1,
    cost: 4_000,
    paint: true,
    description: "Landside roads for arriving passengers. Drag to paint.",
    purpose:
      "Curb and access paving. Passengers walk these roads between parking, the terminal, and the city side.",
    capacity: { people: 8, aircraft: 0 },
  },
  {
    id: "parking",
    name: "Parking Lot",
    category: "landside",
    w: 3,
    h: 2,
    cost: 25_000,
    paint: false,
    description: "Passenger arrival point. Boosts daily traffic.",
    purpose:
      "Where landside travelers arrive and leave by car. Departing passengers spawn here and arrivals walk back to it.",
    capacity: { people: 48, aircraft: 0 },
  },
  {
    id: "cafe",
    name: "Cafe",
    category: "commercial",
    w: 2,
    h: 2,
    cost: 35_000,
    paint: false,
    description: "Coffee and snacks. Earns per visiting passenger.",
    purpose:
      "A concession that sells drinks and snacks. Passengers who pass through spend a little and feel better about the airport.",
    capacity: { people: 24, aircraft: 0 },
  },
  {
    id: "shop",
    name: "Retail Shop",
    category: "commercial",
    w: 2,
    h: 2,
    cost: 42_000,
    paint: false,
    description: "Newsstand and gifts. Extra revenue and satisfaction.",
    purpose:
      "Retail space for gifts and travel goods. Each visiting passenger can generate a sale and a small rating boost.",
    capacity: { people: 20, aircraft: 0 },
  },
];

export const BUILD_BY_ID = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b]),
) as Record<BuildDef["id"], BuildDef>;

export const AIRLINES: Airline[] = [
  { id: "horizon", name: "Horizon Air", code: "HA", color: 0x2f6fed, tier: "regional" },
  { id: "summit", name: "Summit Express", code: "SX", color: 0xd4532a, tier: "national" },
  { id: "pacific", name: "Pacific Crown", code: "PC", color: 0x1f8a70, tier: "international" },
];

export const AIRLINE_BY_ID = Object.fromEntries(
  AIRLINES.map((a) => [a.id, a]),
) as Record<string, Airline>;

export const CITIES = {
  regional: ["Cedar Falls", "Redwood", "Bayview", "Millfield", "Stone Harbor"],
  national: ["Chicago", "Denver", "Atlanta", "Dallas", "Seattle"],
  international: ["London", "Tokyo", "Frankfurt", "Dubai", "Toronto"],
};

export const STAFF_ROLES: Record<
  StaffRole,
  { label: string; wagePerDay: number; firstNames: string[] }
> = {
  agent: {
    label: "Ticket Agent",
    wagePerDay: 100,
    firstNames: ["Maya", "Owen", "Priya", "Luis", "Hannah", "Theo"],
  },
  security: {
    label: "Security Officer",
    wagePerDay: 120,
    firstNames: ["Nora", "Jamal", "Elena", "Chris", "Aisha", "Ben"],
  },
  handler: {
    label: "Baggage Handler",
    wagePerDay: 95,
    firstNames: ["Rico", "Sam", "Keisha", "Anton", "Lila", "Drew"],
  },
  ground: {
    label: "Ground Crew",
    wagePerDay: 110,
    firstNames: ["Ivy", "Marcus", "Sofia", "Ken", "Tara", "Paul"],
  },
  maintenance: {
    label: "Maintenance",
    wagePerDay: 130,
    firstNames: ["Hugo", "Quinn", "Nadia", "Felix", "Rosa", "Abe"],
  },
};

export const LAST_NAMES = [
  "Cole",
  "Park",
  "Nguyen",
  "Reyes",
  "Shah",
  "Brooks",
  "Khan",
  "Diaz",
];

export function categoryLabel(category: BuildDef["category"]) {
  switch (category) {
    case "airside":
      return "Airside";
    case "terminal":
      return "Terminal";
    case "landside":
      return "Landside";
    case "commercial":
      return "Commercial";
  }
}

export function progressionLabel(runways: number, terminals: number, gates: number) {
  if (runways === 0 && terminals === 0) return "Empty Land";
  if (gates < 2) return "Regional Airfield";
  if (terminals < 2) return "Regional Airport";
  return "National Hub";
}
