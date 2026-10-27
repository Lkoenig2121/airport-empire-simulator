export const MAP_SIZE = 36;
export const TILE_W = 64;
export const TILE_H = 32;
export const STARTING_CASH = 1_000_000;
export const MINUTES_PER_REAL_SECOND = 2;

export type BuildId =
  | "runway"
  | "taxiway"
  | "terminal"
  | "gate"
  | "road"
  | "parking"
  | "cafe"
  | "shop"
  | "hangar"
  | "security";

export type BuildCategory = "airside" | "terminal" | "landside" | "commercial";

export type BuildDef = {
  id: BuildId;
  name: string;
  category: BuildCategory;
  w: number;
  h: number;
  cost: number;
  paint: boolean;
  description: string;
  purpose: string;
  capacity: { people: number; aircraft: number };
  unlockHint?: string;
};

export type Inspection =
  | { kind: "building"; id: string }
  | { kind: "ground"; x: number; y: number }
  | { kind: "aircraft"; id: string };

export type Building = {
  id: string;
  type: BuildId;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type StaffRole =
  | "agent"
  | "security"
  | "handler"
  | "ground"
  | "maintenance";

export type StaffMember = {
  id: string;
  name: string;
  role: StaffRole;
  wagePerDay: number;
};

export type Airline = {
  id: string;
  name: string;
  code: string;
  color: number;
  tier: "regional" | "national" | "international";
};

export type FlightStatus =
  | "scheduled"
  | "inbound"
  | "landing"
  | "taxiing"
  | "at-gate"
  | "boarding"
  | "departed"
  | "cancelled";

export type Flight = {
  id: string;
  flightNo: string;
  airlineId: string;
  origin: string;
  destination: string;
  kind: "arrival" | "departure";
  status: FlightStatus;
  scheduledMin: number;
  passengers: number;
  aircraftId: string | null;
  gateId: string | null;
};

export type AircraftState =
  | "approach"
  | "landing"
  | "taxi-in"
  | "parked"
  | "taxi-out"
  | "takeoff"
  | "gone";

export type Aircraft = {
  id: string;
  flightId: string;
  airlineId: string;
  x: number;
  y: number;
  heading: number;
  alt: number;
  state: AircraftState;
  path: { x: number; y: number }[];
  wait: number;
};

export type Passenger = {
  id: string;
  x: number;
  y: number;
  path: { x: number; y: number }[];
  color: number;
  kind: "departing" | "arriving";
  spent: boolean;
};

export type LedgerEntry = {
  id: string;
  minutes: number;
  label: string;
  amount: number;
};

export type Notice = {
  id: string;
  kind: "info" | "success" | "warn" | "money";
  title: string;
  body: string;
  at: number;
};

export type PanelId = "none" | "flights" | "build" | "staff" | "finance" | "analytics";

export type GameSpeed = 0 | 1 | 2 | 3;

export type Stats = {
  passengersToday: number;
  passengersTotal: number;
  flightsToday: number;
  revenueToday: number;
  expensesToday: number;
  rating: number;
};

export type GameState = {
  airportName: string;
  welcome: boolean;
  minutes: number;
  speed: GameSpeed;
  cash: number;
  buildings: Building[];
  staff: StaffMember[];
  flights: Flight[];
  aircraft: Aircraft[];
  passengers: Passenger[];
  ledger: LedgerEntry[];
  notices: Notice[];
  unlockedAirlines: string[];
  stats: Stats;
  selectedTool: BuildId | "demolish" | null;
  inspect: Inspection | null;
  panel: PanelId;
  hoverCell: { x: number; y: number } | null;
  rotate: boolean;
};
