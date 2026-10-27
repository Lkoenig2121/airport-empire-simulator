export const TARGET_FLIGHT_DURATION_SECONDS = 60;
export const HOME_AIRPORT_ID = "skyport";
export const FLIGHT_PAYOUT = 100_000;

export type NavPoint = { x: number; y: number };

export type Destination = {
  id: string;
  name: string;
  region: "home" | "regional" | "national" | "international";
  x: number;
  y: number;
  hasRunway: boolean;
  editable: boolean;
  code: string;
  tagline: string;
};

export type FlightPhase =
  | "preparing"
  | "takeoff"
  | "enroute"
  | "approaching"
  | "arriving"
  | "completed";

export type FlightView = "cockpit" | "map" | "planner" | "history" | "menu";

export type FlightCraft = {
  x: number;
  y: number;
  heading: number;
  alt: number;
  pitch: number;
  bank: number;
  throttle: number;
  airspeed: number;
  lateral: number;
};

export type FlightSession = {
  id: string;
  aircraftId: string;
  flightNo: string;
  airlineId: string;
  originId: string;
  destinationId: string;
  routeStart: NavPoint;
  craft: FlightCraft;
  elapsed: number;
  targetDuration: number;
  paused: boolean;
  started: boolean;
  phase: FlightPhase;
  view: FlightView;
  search: string;
};

export type FlightHistoryEntry = {
  id: string;
  flightNo: string;
  aircraftId: string;
  originId: string;
  destinationId: string;
  duration: number;
  distance: number;
  status: "completed" | "diverted";
  at: number;
};

export type FlightInput = {
  throttle: number;
  yaw: number;
  pitch: number;
  roll: number;
};

export const emptyFlightInput = (): FlightInput => ({
  throttle: 0,
  yaw: 0,
  pitch: 0,
  roll: 0,
});
