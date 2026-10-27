import { DESTINATIONS, DESTINATION_BY_ID, displayNm, navDistance, navHeading } from "./destinations";
import {
  HOME_AIRPORT_ID,
  TARGET_FLIGHT_DURATION_SECONDS,
  type FlightCraft,
  type FlightHistoryEntry,
  type FlightInput,
  type FlightPhase,
  type FlightSession,
  type NavPoint,
} from "./types";

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function lerpAngle(a: number, b: number, t: number) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export function easeInOut(t: number) {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
}

export function flightProgress(elapsed: number, duration = TARGET_FLIGHT_DURATION_SECONDS) {
  if (duration <= 0) return 1;
  return clamp(elapsed / duration, 0, 1);
}

export function phaseFor(elapsed: number, started: boolean, duration = TARGET_FLIGHT_DURATION_SECONDS): FlightPhase {
  if (!started) return "preparing";
  const p = flightProgress(elapsed, duration);
  if (p >= 1) return "completed";
  if (p >= 0.92) return "arriving";
  if (p >= 0.82) return "approaching";
  if (p < 0.12) return "takeoff";
  return "enroute";
}

export function cruiseAltitude(phase: FlightPhase, progress: number) {
  if (phase === "preparing") return 120;
  if (phase === "takeoff") return lerp(180, 9200, clamp(progress / 0.12, 0, 1));
  if (phase === "approaching") return lerp(9200, 2400, clamp((progress - 0.82) / 0.1, 0, 1));
  if (phase === "arriving" || phase === "completed") return lerp(2400, 220, clamp((progress - 0.92) / 0.08, 0, 1));
  return 9200;
}

export function routePoint(start: NavPoint, dest: NavPoint, progress: number): NavPoint {
  const t = easeInOut(progress);
  return { x: lerp(start.x, dest.x, t), y: lerp(start.y, dest.y, t) };
}

export function createCraft(at: NavPoint, heading = 0): FlightCraft {
  return {
    x: at.x,
    y: at.y,
    heading,
    alt: 120,
    pitch: 0,
    bank: 0,
    throttle: 0.35,
    airspeed: 0,
    lateral: 0,
  };
}

export function createSession(args: {
  id?: string;
  aircraftId: string;
  flightNo: string;
  airlineId: string;
  originId: string;
  destinationId: string;
}): FlightSession {
  const origin = DESTINATION_BY_ID[args.originId] ?? DESTINATION_BY_ID[HOME_AIRPORT_ID];
  const fallback = DESTINATIONS.find((d) => d.id !== origin.id)?.id ?? args.destinationId;
  const destinationId = canSelectDestination(origin.id, args.destinationId).ok
    ? args.destinationId
    : fallback;
  const dest = DESTINATION_BY_ID[destinationId];
  const start = { x: origin.x, y: origin.y };
  return {
    id: args.id ?? `pf_${Math.random().toString(36).slice(2, 9)}`,
    aircraftId: args.aircraftId,
    flightNo: args.flightNo,
    airlineId: args.airlineId,
    originId: origin.id,
    destinationId,
    routeStart: start,
    craft: createCraft(start, dest ? navHeading(start, dest) : 0),
    elapsed: 0,
    targetDuration: TARGET_FLIGHT_DURATION_SECONDS,
    paused: false,
    started: false,
    phase: "preparing",
    view: "planner",
    search: "",
  };
}

export function headingDegrees(radians: number) {
  return Math.round((((radians * 180) / Math.PI) % 360 + 360) % 360);
}

export function phaseLabel(phase: FlightPhase) {
  switch (phase) {
    case "preparing":
      return "Preparing for departure";
    case "takeoff":
      return "Taking off";
    case "enroute":
      return "En route";
    case "approaching":
      return "Approaching destination";
    case "arriving":
      return "Arriving";
    case "completed":
      return "Flight completed";
  }
}

export function remainingTime(session: FlightSession) {
  return Math.max(0, session.targetDuration - session.elapsed);
}

export function sessionDistance(session: FlightSession) {
  const dest = DESTINATION_BY_ID[session.destinationId];
  if (!dest) return 0;
  return navDistance(session.craft, dest);
}

export function guidance(session: FlightSession) {
  const dest = DESTINATION_BY_ID[session.destinationId];
  if (!dest) return { heading: session.craft.heading, distance: 0, eta: remainingTime(session) };
  return {
    heading: navHeading(session.craft, dest),
    distance: navDistance(session.craft, dest),
    eta: remainingTime(session),
  };
}

export function canSelectDestination(originId: string, destinationId: string) {
  if (!DESTINATION_BY_ID[destinationId]) return { ok: false, reason: "Unknown destination." };
  if (originId === destinationId) return { ok: false, reason: "Choose a different airport than your origin." };
  return { ok: true as const };
}

export function changeDestination(session: FlightSession, destinationId: string): FlightSession {
  if (!DESTINATION_BY_ID[destinationId]) return session;
  if (!session.started && destinationId === session.originId) return session;
  return {
    ...session,
    destinationId,
    routeStart: { x: session.craft.x, y: session.craft.y },
  };
}

export function startFlight(session: FlightSession): FlightSession {
  if (session.started) return session;
  const check = canSelectDestination(session.originId, session.destinationId);
  if (!check.ok) return session;
  const dest = DESTINATION_BY_ID[session.destinationId];
  const heading = navHeading(session.routeStart, dest);
  return {
    ...session,
    started: true,
    paused: false,
    elapsed: 0,
    phase: "takeoff",
    view: "cockpit",
    craft: {
      ...session.craft,
      heading,
      throttle: 0.72,
    },
  };
}

export function advanceFlight(session: FlightSession, dtSec: number, input: FlightInput): FlightSession {
  if (session.phase === "completed") return session;

  const throttle = clamp(session.craft.throttle + input.throttle * 0.55 * dtSec, 0.05, 1);
  const pitch = clamp(session.craft.pitch + input.pitch * 28 * dtSec, -22, 22);
  const bank = clamp(session.craft.bank + input.roll * 40 * dtSec - session.craft.bank * 1.8 * dtSec, -35, 35);
  let heading = session.craft.heading + (input.yaw * 0.7 + bank / 55) * dtSec;
  let lateral = clamp(session.craft.lateral + input.yaw * 14 * dtSec, -18, 18);
  lateral *= 1 - Math.min(0.85, 1.1 * dtSec);

  if (session.paused || !session.started) {
    const airspeed = lerp(session.craft.airspeed, 40 + throttle * 80, 0.08);
    return {
      ...session,
      craft: { ...session.craft, throttle, pitch, bank, heading, lateral, airspeed, alt: session.craft.alt },
    };
  }

  const elapsed = session.elapsed + dtSec;
  const progress = flightProgress(elapsed, session.targetDuration);
  const phase = phaseFor(elapsed, true, session.targetDuration);
  const dest = DESTINATION_BY_ID[session.destinationId];
  if (!dest) return { ...session, elapsed, phase };

  const along = routePoint(session.routeStart, dest, progress);
  const desired = navHeading(session.craft, dest);
  heading = lerpAngle(heading, desired, clamp(0.55 * dtSec, 0, 1));
  lateral *= 1 - Math.min(0.9, 1.4 * dtSec);

  const nx = along.x + Math.cos(desired + Math.PI / 2) * lateral;
  const ny = along.y + Math.sin(desired + Math.PI / 2) * lateral;
  const alt = cruiseAltitude(phase, progress);
  const targetSpeed = 160 + throttle * 280;
  const airspeed = lerp(session.craft.airspeed || 180, targetSpeed, 1 - Math.exp(-dtSec * 1.4));

  return {
    ...session,
    elapsed,
    phase,
    craft: {
      x: nx,
      y: ny,
      heading,
      alt,
      pitch: lerp(pitch, phase === "takeoff" ? 8 : phase === "approaching" || phase === "arriving" ? -5 : 1, 0.08),
      bank,
      throttle,
      airspeed,
      lateral,
    },
  };
}

export function historyEntry(session: FlightSession, status: FlightHistoryEntry["status"]): FlightHistoryEntry {
  const dest = DESTINATION_BY_ID[session.destinationId];
  const origin = DESTINATION_BY_ID[session.originId];
  const distance = dest && origin ? displayNm(navDistance(origin, dest)) : 0;
  return {
    id: session.id,
    flightNo: session.flightNo,
    aircraftId: session.aircraftId,
    originId: session.originId,
    destinationId: session.destinationId,
    duration: session.elapsed,
    distance,
    status,
    at: Date.now(),
  };
}
