import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DESTINATIONS } from "./destinations";
import {
  advanceFlight,
  canSelectDestination,
  changeDestination,
  createCraft,
  flightProgress,
  historyEntry,
  phaseFor,
  remainingTime,
  startFlight,
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

function closeTo(actual: number, expected: number, digits = 5) {
  const tol = 10 ** -digits;
  assert.ok(Math.abs(actual - expected) <= tol, `expected ${actual} to be close to ${expected}`);
}

describe("flight timer and progression", () => {
  it("maps elapsed time to a 0-1 progress value", () => {
    assert.equal(flightProgress(0), 0);
    closeTo(flightProgress(30), 0.5);
    assert.equal(flightProgress(60), 1);
    assert.equal(flightProgress(90), 1);
  });

  it("uses 60 seconds as the default duration", () => {
    assert.equal(TARGET_FLIGHT_DURATION_SECONDS, 60);
    assert.equal(phaseFor(6, true), "takeoff");
    assert.equal(phaseFor(30, true), "enroute");
    assert.equal(phaseFor(50, true), "approaching");
    assert.equal(phaseFor(56, true), "arriving");
    assert.equal(phaseFor(60, true), "completed");
  });

  it("reaches about 50% at 30 seconds of active time", () => {
    let s = startFlight(session());
    const input = emptyFlightInput();
    for (let i = 0; i < 30; i++) s = advanceFlight(s, 1, input);
    closeTo(s.elapsed, 30);
    closeTo(flightProgress(s.elapsed), 0.5);
    assert.equal(s.phase, "enroute");
  });

  it("completes at approximately 60 seconds", () => {
    let s = startFlight(session());
    const input = emptyFlightInput();
    for (let i = 0; i < 60; i++) s = advanceFlight(s, 1, input);
    closeTo(s.elapsed, 60);
    assert.equal(s.phase, "completed");
    assert.equal(remainingTime(s), 0);
  });

  it("pauses the timer while paused", () => {
    let s = startFlight(session());
    s = { ...s, paused: true };
    const next = advanceFlight(s, 5, emptyFlightInput());
    assert.equal(next.elapsed, 0);
    assert.equal(next.phase, "takeoff");
  });

  it("resumes elapsed time after pause", () => {
    let s = startFlight(session());
    s = advanceFlight(s, 10, emptyFlightInput());
    s = { ...s, paused: true };
    s = advanceFlight(s, 8, emptyFlightInput());
    closeTo(s.elapsed, 10);
    s = { ...s, paused: false };
    s = advanceFlight(s, 5, emptyFlightInput());
    closeTo(s.elapsed, 15);
  });

  it("does not reset elapsed when the destination changes", () => {
    let s = startFlight(session());
    for (let i = 0; i < 20; i++) s = advanceFlight(s, 1, emptyFlightInput());
    const later = DESTINATIONS[2];
    s = changeDestination(s, later.id);
    closeTo(s.elapsed, 20);
    assert.equal(s.destinationId, later.id);
    for (let i = 0; i < 40; i++) s = advanceFlight(s, 1, emptyFlightInput());
    assert.equal(s.phase, "completed");
    closeTo(s.elapsed, 60);
  });

  it("rejects flying to the same airport before departure", () => {
    const origin = DESTINATIONS[0];
    assert.equal(canSelectDestination(origin.id, origin.id).ok, false);
    assert.equal(canSelectDestination(origin.id, DESTINATIONS[1].id).ok, true);
  });

  it("records an arrival history entry", () => {
    const s = { ...startFlight(session()), elapsed: 60, phase: "completed" as const };
    const entry = historyEntry(s, "completed");
    assert.equal(entry.status, "completed");
    assert.equal(entry.destinationId, s.destinationId);
    assert.equal(entry.duration, 60);
  });
});
