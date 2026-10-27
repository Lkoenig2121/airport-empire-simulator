import { DESTINATIONS } from "./destinations";
import {
  advanceFlight,
  canSelectDestination,
  changeDestination,
  flightProgress,
  historyEntry,
  phaseFor,
  remainingTime,
  startFlight,
  createCraft,
} from "./engine";
import { TARGET_FLIGHT_DURATION_SECONDS, emptyFlightInput, type FlightSession } from "./types";

function session(partial: Partial<FlightSession> = {}): FlightSession {
  const origin = DESTINATIONS[0];
  const dest = DESTINATIONS[1];
  return {
    id: "test",
    aircraftId: "ac1",
    flightNo: "HA 100",
    airlineId: "horizon",
    originId: origin.id,
    destinationId: dest.id,
    routeStart: { x: origin.x, y: origin.y },
    craft: createCraft({ x: origin.x, y: origin.y }),
    elapsed: 0,
    targetDuration: TARGET_FLIGHT_DURATION_SECONDS,
    paused: false,
    started: false,
    phase: "preparing",
    view: "planner",
    search: "",
    ...partial,
  };
}

function check(name: string, ok: boolean) {
  if (!ok) throw new Error(`FAIL: ${name}`);
  console.log(`ok - ${name}`);
}

check("duration constant", TARGET_FLIGHT_DURATION_SECONDS === 60);
check("progress 0", flightProgress(0) === 0);
check("progress 50%", Math.abs(flightProgress(30) - 0.5) < 1e-9);
check("progress 100%", flightProgress(60) === 1);
check("phase takeoff", phaseFor(6, true) === "takeoff");
check("phase enroute", phaseFor(30, true) === "enroute");
check("phase approaching", phaseFor(50, true) === "approaching");
check("phase arriving", phaseFor(56, true) === "arriving");
check("phase completed", phaseFor(60, true) === "completed");

let s = startFlight(session());
for (let i = 0; i < 30; i++) s = advanceFlight(s, 1, emptyFlightInput());
check("30s elapsed", Math.abs(s.elapsed - 30) < 1e-6);
check("30s phase", s.phase === "enroute");

s = { ...s, paused: true };
s = advanceFlight(s, 8, emptyFlightInput());
check("pause holds elapsed", Math.abs(s.elapsed - 30) < 1e-6);
s = { ...s, paused: false };
s = changeDestination(s, DESTINATIONS[2].id);
check("dest change keeps elapsed", Math.abs(s.elapsed - 30) < 1e-6);
for (let i = 0; i < 30; i++) s = advanceFlight(s, 1, emptyFlightInput());
check("arrives at 60s", s.phase === "completed" && remainingTime(s) === 0);

const entry = historyEntry(s, "completed");
check("history", entry.status === "completed" && entry.duration === 60);
check("reject same airport", canSelectDestination(DESTINATIONS[0].id, DESTINATIONS[0].id).ok === false);

console.log("all flight engine tests passed");
