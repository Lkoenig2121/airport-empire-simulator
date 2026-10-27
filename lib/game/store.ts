"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DESTINATION_BY_ID, DESTINATIONS, destinationByName, nextAirportId } from "@/lib/flight/destinations";
import {
  advanceFlight,
  canSelectDestination,
  changeDestination,
  createSession,
  historyEntry,
  startFlight,
} from "@/lib/flight/engine";
import { readFlightInput } from "@/lib/flight/input";
import { FLIGHT_PAYOUT, HOME_AIRPORT_ID, type FlightView } from "@/lib/flight/types";
import { advanceHubTraffic, isHomeAirport, parkOnAirport, seedHubTraffic } from "./hubs";
import { worldAircraft, worldBuildings } from "./world";
import { BUILD_BY_ID } from "./catalog";
import { cellsOf, uid } from "./iso";
import {
  advanceSimulation,
  canPlace,
  countType,
  footprint,
  hireStaff,
  isOperational,
  occupiedMap,
  placementCost,
  returnPlayerAircraft,
} from "./simulation";
import { resolveInspect } from "./inspect";
import { starterSlice } from "./starter";
import type { BuildId, GameSpeed, GameState, PanelId, StaffRole } from "./types";
import { STARTING_CASH } from "./types";

type GameActions = {
  tick: (dtSec: number) => void;
  setSpeed: (speed: GameSpeed) => void;
  setPanel: (panel: PanelId) => void;
  setTool: (tool: GameState["selectedTool"]) => void;
  setHover: (cell: GameState["hoverCell"]) => void;
  toggleRotate: () => void;
  place: (x: number, y: number) => boolean;
  demolish: (x: number, y: number) => void;
  sellBuilding: (id: string) => void;
  hire: (role: StaffRole) => void;
  fire: (id: string) => void;
  dismissWelcome: () => void;
  dismissNotice: (id: string) => void;
  rename: (name: string) => void;
  newGame: () => void;
  inspectAt: (x: number, y: number) => void;
  clearInspect: () => void;
  enterCockpit: (aircraftId: string) => void;
  exitToAirport: () => void;
  resumeCockpit: () => void;
  startPlayerFlight: () => { ok: true } | { ok: false; reason: string };
  setFlightDestination: (id: string) => { ok: true } | { ok: false; reason: string };
  setFlightView: (view: FlightView) => void;
  setFlightSearch: (search: string) => void;
  toggleFlightPause: () => void;
  tickFlight: (dtSec: number) => void;
  continueFlight: () => void;
  abandonFlight: () => void;
  flyToAirport: (destinationId: string) => { ok: true } | { ok: false; reason: string };
  cycleAirport: (dir: 1 | -1) => void;
};

let uiFlush = 0;

const fresh = (): GameState => {
  const airportName = "Skyport International";
  return {
    airportName,
    welcome: true,
    minutes: 6 * 60,
    speed: 1,
    cash: STARTING_CASH,
    passengers: [],
    ledger: [],
    ...starterSlice(airportName),
    selectedTool: null,
    inspect: null,
    panel: "build",
    hoverCell: null,
    rotate: false,
    flight: null,
    flightOverlay: false,
    flightHistory: [],
    currentAirportId: HOME_AIRPORT_ID,
    hubAircraft: [],
    hubPassengers: [],
  };
};

export const useGame = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...fresh(),

      tick: (dtSec) => {
        const state = get();
        const patch = advanceSimulation(state, dtSec);
        if (!isHomeAirport(state.currentAirportId) && state.speed !== 0) {
          const hub = advanceHubTraffic(state.currentAirportId, state.hubAircraft, state.hubPassengers, dtSec * Math.max(1, state.speed));
          patch.hubAircraft = hub.aircraft;
          patch.hubPassengers = hub.passengers;
        }
        if (!Object.keys(patch).length) return;
        const current = get();
        if (patch.aircraft) current.aircraft = patch.aircraft;
        if (patch.passengers) current.passengers = patch.passengers;
        if (patch.minutes !== undefined) current.minutes = patch.minutes;
        if (patch.hubAircraft) current.hubAircraft = patch.hubAircraft;
        if (patch.hubPassengers) current.hubPassengers = patch.hubPassengers;
        uiFlush += dtSec;
        const important = Boolean(patch.notices || patch.unlockedAirlines || patch.ledger);
        if (important || uiFlush >= 0.2) {
          uiFlush = 0;
          set(patch);
        }
      },

      setSpeed: (speed) => set({ speed }),
      setPanel: (panel) =>
        set({
          panel,
          selectedTool: panel === "build" ? get().selectedTool : null,
          inspect: panel === "build" ? get().inspect : null,
        }),
      setTool: (tool) => {
        if (!isHomeAirport(get().currentAirportId)) return;
        set({ selectedTool: tool, panel: "build", inspect: null });
      },
      inspectAt: (x, y) => {
        const state = get();
        const inspect = resolveInspect(x, y, worldBuildings(state), worldAircraft(state));
        const panel = state.panel;
        const closeRight = panel === "flights" || panel === "staff" || panel === "finance" || panel === "analytics";
        set({
          inspect,
          selectedTool: null,
          panel: closeRight ? "none" : panel,
        });
      },
      clearInspect: () => set({ inspect: null }),
      setHover: (hoverCell) => set({ hoverCell }),
      toggleRotate: () => set({ rotate: !get().rotate }),

      place: (x, y) => {
        const { selectedTool, buildings, cash, rotate, notices } = get();
        if (!isHomeAirport(get().currentAirportId)) return false;
        if (!selectedTool || selectedTool === "demolish") return false;
        if (!canPlace(buildings, selectedTool, x, y, rotate)) return false;
        const { w, h } = footprint(selectedTool, rotate);
        const cost = placementCost(selectedTool, w, h);
        if (cash < cost) {
          set({
            notices: [
              {
                id: uid("note"),
                kind: "warn" as const,
                title: "Insufficient funds",
                body: `${BUILD_BY_ID[selectedTool].name} costs $${cost.toLocaleString()}.`,
                at: Date.now(),
              },
              ...notices,
            ].slice(0, 5),
          });
          return false;
        }

        const building = {
          id: uid(selectedTool),
          type: selectedTool,
          x,
          y,
          w,
          h,
        };

        const nextBuildings = [...buildings, building];
        const nextNotices = [...notices];
        let staff = get().staff;

        if (selectedTool === "terminal" && countType(buildings, "terminal") === 0) {
          staff = [
            ...staff,
            hireStaff("agent"),
            hireStaff("agent"),
            hireStaff("security"),
          ];
          nextNotices.unshift({
            id: uid("note"),
            kind: "info",
            title: "Crew hired",
            body: "Two agents and a security officer joined the payroll.",
            at: Date.now(),
          });
        }
        if (selectedTool === "runway" && countType(buildings, "runway") === 0) {
          staff = [...staff, hireStaff("ground")];
          nextNotices.unshift({
            id: uid("note"),
            kind: "info",
            title: "Ground crew on duty",
            body: "A ground team is assigned to the new runway.",
            at: Date.now(),
          });
        }
        if (selectedTool === "gate") {
          staff = [...staff, hireStaff("handler")];
        }
        if (
          isOperational(nextBuildings) &&
          !isOperational(buildings)
        ) {
          nextNotices.unshift({
            id: uid("note"),
            kind: "success",
            title: "Airport open",
            body: "Skyport is operational. Watch the skies for Horizon Air.",
            at: Date.now(),
          });
        }

        set({
          buildings: nextBuildings,
          cash: cash - cost,
          staff,
          notices: nextNotices.slice(0, 5),
          ledger: [
            {
              id: uid("led"),
              minutes: get().minutes,
              label: `Built ${BUILD_BY_ID[selectedTool].name}`,
              amount: -cost,
            },
            ...get().ledger,
          ].slice(0, 40),
          stats: {
            ...get().stats,
            expensesToday: get().stats.expensesToday + cost,
          },
        });
        return true;
      },

      demolish: (x, y) => {
        if (!isHomeAirport(get().currentAirportId)) return;
        const hit = occupiedMap(get().buildings).get(`${x},${y}`);
        if (hit) get().sellBuilding(hit.id);
      },

      sellBuilding: (id) => {
        if (!isHomeAirport(get().currentAirportId)) return;
        const hit = get().buildings.find((b) => b.id === id);
        if (!hit) return;
        const refund = Math.round(placementCost(hit.type, hit.w, hit.h) * 0.4);
        set({
          buildings: get().buildings.filter((b) => b.id !== hit.id),
          cash: get().cash + refund,
          inspect: null,
          ledger: [
            {
              id: uid("led"),
              minutes: get().minutes,
              label: `Sold ${BUILD_BY_ID[hit.type].name}`,
              amount: refund,
            },
            ...get().ledger,
          ].slice(0, 40),
          notices: [
            {
              id: uid("note"),
              kind: "money" as const,
              title: `Sold ${BUILD_BY_ID[hit.type].name}`,
              body: `Refunded $${refund.toLocaleString()} (40%).`,
              at: Date.now(),
            },
            ...get().notices,
          ].slice(0, 5),
        });
      },

      hire: (role) => {
        const person = hireStaff(role);
        set({
          staff: [...get().staff, person],
          notices: [
            {
              id: uid("note"),
              kind: "info" as const,
              title: "New hire",
              body: `${person.name} joined as ${role}.`,
              at: Date.now(),
            },
            ...get().notices,
          ].slice(0, 5),
        });
      },

      fire: (id) => set({ staff: get().staff.filter((s) => s.id !== id) }),

      dismissWelcome: () => set({ welcome: false, panel: "build", selectedTool: null }),
      dismissNotice: (id) =>
        set({ notices: get().notices.filter((n) => n.id !== id) }),
      rename: (airportName) => set({ airportName }),
      newGame: () => set({ ...fresh(), welcome: false, panel: "build", selectedTool: null }),

      enterCockpit: (aircraftId) => {
        const { aircraft, flights, flight, currentAirportId } = get();
        if (flight?.started && flight.phase !== "completed") {
          set({ flightOverlay: true, inspect: null, selectedTool: null });
          return;
        }
        const plane = worldAircraft(get()).find((a) => a.id === aircraftId) ?? aircraft.find((a) => a.id === aircraftId);
        if (!plane) return;
        const scheduled = flights.find((f) => f.id === plane.flightId);
        const named = scheduled
          ? destinationByName(scheduled.kind === "departure" ? scheduled.destination : scheduled.origin)
          : null;
        const originId = currentAirportId || HOME_AIRPORT_ID;
        const destGuess =
          named && named.id !== originId
            ? named.id
            : nextAirportId(originId, 1);
        const destinationId = destGuess === originId ? nextAirportId(originId, 1) : destGuess;
        set({
          flight: createSession({
            aircraftId: plane.id,
            flightNo: scheduled?.flightNo ?? "PF 1",
            airlineId: plane.airlineId,
            originId,
            destinationId,
          }),
          flightOverlay: true,
          inspect: null,
          selectedTool: null,
          aircraft: aircraft.some((a) => a.id === plane.id)
            ? aircraft.map((a) =>
                a.id === plane.id
                  ? { ...a, controlledBy: "player" as const, airportId: originId }
                  : a.controlledBy === "player"
                    ? { ...a, controlledBy: undefined }
                    : a,
              )
            : [
                ...aircraft.map((a) => (a.controlledBy === "player" ? { ...a, controlledBy: undefined } : a)),
                { ...plane, controlledBy: "player" as const, airportId: originId },
              ],
        });
      },

      exitToAirport: () => {
        const { flight, aircraft, flightHistory } = get();
        if (!flight) {
          set({ flightOverlay: false });
          return;
        }
        const dest = DESTINATION_BY_ID[flight.destinationId];
        const finishedAway = flight.phase === "completed" && dest?.id !== HOME_AIRPORT_ID;
        const logged = flightHistory.some((h) => h.id === flight.id);
        set({
          flightOverlay: false,
          flight: flight.started && flight.phase !== "completed" ? { ...flight, paused: true, view: "cockpit" } : null,
          aircraft: aircraft.map((a) => {
            if (a.id !== flight.aircraftId) return a;
            if (finishedAway) return { ...a, state: "gone" as const, controlledBy: undefined, path: [] };
            if (!flight.started) return { ...a, controlledBy: undefined };
            return a;
          }),
          flightHistory: logged || flight.phase !== "completed" ? flightHistory : [historyEntry(flight, "completed"), ...flightHistory].slice(0, 40),
        });
      },

      resumeCockpit: () => {
        if (!get().flight) return;
        set({ flightOverlay: true, inspect: null, selectedTool: null, panel: "none" });
      },

      startPlayerFlight: () => {
        const flight = get().flight;
        if (!flight) return { ok: false, reason: "No aircraft is in the cockpit." };
        const check = canSelectDestination(flight.originId, flight.destinationId);
        if (!check.ok) return check;
        const next = startFlight(flight);
        if (!next.started) return { ok: false, reason: "Choose a valid destination before departing." };
        set({
          flight: { ...next, view: "cockpit" },
          flights: get().flights.map((f) =>
            f.aircraftId === next.aircraftId ? { ...f, status: "departed" as const } : f,
          ),
        });
        return { ok: true };
      },

      setFlightDestination: (id) => {
        const flight = get().flight;
        if (!flight) return { ok: false, reason: "No active flight." };
        const check = flight.started
          ? DESTINATION_BY_ID[id]
            ? { ok: true as const }
            : { ok: false, reason: "Unknown destination." }
          : canSelectDestination(flight.originId, id);
        if (!check.ok) return check;
        set({ flight: changeDestination(flight, id) });
        return { ok: true };
      },

      setFlightView: (view) => {
        const flight = get().flight;
        if (!flight) return;
        set({ flight: { ...flight, view } });
      },

      setFlightSearch: (search) => {
        const flight = get().flight;
        if (!flight) return;
        set({ flight: { ...flight, search } });
      },

      toggleFlightPause: () => {
        const flight = get().flight;
        if (!flight?.started || flight.phase === "completed") return;
        set({ flight: { ...flight, paused: !flight.paused } });
      },

      tickFlight: (dtSec) => {
        const { flight, flightHistory } = get();
        if (!flight || flight.phase === "completed") return;
        const next = advanceFlight(flight, dtSec, readFlightInput());
        if (next === flight) return;
        if (next.phase === "completed" && !flightHistory.some((h) => h.id === next.id)) {
          const dest = DESTINATION_BY_ID[next.destinationId];
          const home = dest?.id === HOME_AIRPORT_ID;
          const originName = DESTINATION_BY_ID[next.originId]?.name ?? "Origin";
          const destId = dest?.id ?? HOME_AIRPORT_ID;
          const destBuildings = home ? get().buildings : worldBuildings({ currentAirportId: destId, buildings: get().buildings });
          const traffic = home ? { aircraft: [], passengers: [] } : seedHubTraffic(destId);
          const payout = next.originId === HOME_AIRPORT_ID ? FLIGHT_PAYOUT : 0;
          const stats = get().stats;
          set({
            flight: next,
            cash: get().cash + payout,
            stats: payout ? { ...stats, revenueToday: stats.revenueToday + payout } : stats,
            selectedTool: null,
            currentAirportId: destId,
            hubAircraft: home ? [] : traffic.aircraft,
            hubPassengers: home ? [] : traffic.passengers,
            flightHistory: [historyEntry(next, "completed"), ...flightHistory].slice(0, 40),
            aircraft: (() => {
              const list = get().aircraft;
              const locate = (a: (typeof list)[number]) =>
                home
                  ? { ...returnPlayerAircraft(a, destBuildings, true), airportId: HOME_AIRPORT_ID }
                  : { ...parkOnAirport(a, destBuildings), airportId: destId, controlledBy: undefined };
              if (list.some((a) => a.id === next.aircraftId)) {
                return list.map((a) => (a.id === next.aircraftId ? locate(a) : a));
              }
              return [
                ...list,
                locate({
                  id: next.aircraftId,
                  flightId: next.id,
                  airlineId: next.airlineId,
                  x: 10,
                  y: 10,
                  heading: 0,
                  alt: 0,
                  state: "parked",
                  path: [],
                  wait: 0,
                }),
              ];
            })(),
            flights: get().flights.map((f) => {
              if (f.aircraftId !== next.aircraftId) return f;
              return home
                ? {
                    ...f,
                    kind: "arrival" as const,
                    status: "inbound" as const,
                    origin: originName,
                    destination: get().airportName,
                  }
                : { ...f, status: "departed" as const };
            }),
            notices: [
              {
                id: uid("note"),
                kind: "success" as const,
                title: `${next.flightNo} arrived`,
                body: `Landed at ${dest?.name ?? "destination"} after ${Math.round(next.elapsed)}s.${payout ? ` Earned $${payout.toLocaleString()}.` : ""} ${home ? "Welcome home." : "This hub is read-only."}`,
                at: Date.now(),
              },
              ...get().notices,
            ].slice(0, 5),
          });
          return;
        }
        set({ flight: next });
      },

      continueFlight: () => {
        const prev = get().flight;
        if (!prev || prev.phase !== "completed") return;
        const originId = prev.destinationId;
        const destinationId = nextAirportId(originId, 1);
        set({
          flight: createSession({
            aircraftId: prev.aircraftId,
            flightNo: prev.flightNo,
            airlineId: prev.airlineId,
            originId,
            destinationId,
          }),
          flightOverlay: true,
          aircraft: get().aircraft.map((a) =>
            a.id === prev.aircraftId ? { ...a, controlledBy: "player" as const, state: a.state === "gone" ? "parked" : a.state } : a,
          ),
        });
      },

      flyToAirport: (destinationId) => {
        const { currentAirportId, flight, aircraft } = get();
        if (!DESTINATION_BY_ID[destinationId]) return { ok: false, reason: "Unknown airport." };
        if (flight?.started && flight.phase !== "completed") {
          return get().setFlightDestination(destinationId);
        }
        if (destinationId === currentAirportId) {
          return { ok: false, reason: "You are already at this airport." };
        }
        const check = canSelectDestination(currentAirportId, destinationId);
        if (!check.ok) return check;
        let plane = aircraft.find((a) => a.controlledBy === "player") ?? aircraft.find((a) => (a.airportId ?? HOME_AIRPORT_ID) === currentAirportId);
        if (!plane) {
          plane = {
            id: uid("ac"),
            flightId: uid("fl"),
            airlineId: "horizon",
            x: 16,
            y: 15,
            heading: 0,
            alt: 0,
            state: "parked",
            path: [],
            wait: 0,
            airportId: currentAirportId,
          };
        }
        const session = startFlight(
          createSession({
            aircraftId: plane.id,
            flightNo: "PF 1",
            airlineId: plane.airlineId,
            originId: currentAirportId,
            destinationId,
          }),
        );
        if (!session.started) return { ok: false, reason: "Could not start that flight." };
        set({
          flight: { ...session, view: "cockpit" },
          flightOverlay: true,
          inspect: null,
          selectedTool: null,
          aircraft: aircraft.some((a) => a.id === plane.id)
            ? aircraft.map((a) => (a.id === plane.id ? { ...a, controlledBy: "player" as const } : a))
            : [...aircraft, { ...plane, controlledBy: "player" as const }],
        });
        return { ok: true };
      },

      cycleAirport: (dir) => {
        const next = nextAirportId(get().currentAirportId, dir);
        get().flyToAirport(next);
      },

      abandonFlight: () => {
        const { flight, aircraft } = get();
        if (!flight) {
          set({ flightOverlay: false });
          return;
        }
        set({
          flight: null,
          flightOverlay: false,
          aircraft: aircraft.map((a) =>
            a.id === flight.aircraftId
              ? {
                  ...a,
                  controlledBy: undefined,
                  ...(flight.started ? { state: "gone" as const, path: [] } : {}),
                }
              : a,
          ),
        });
      },
    }),
    {
      name: "airport-empire-save",
      version: 4,
      migrate: (persisted, version) => {
        const prev = persisted as Partial<GameState>;
        const airportName = prev.airportName ?? "Skyport International";
        if (version < 2) {
          return {
            ...prev,
            ...starterSlice(airportName),
            cash: prev.cash && prev.cash > 0 ? prev.cash : STARTING_CASH,
            flight: null,
            flightOverlay: false,
            flightHistory: [],
            currentAirportId: HOME_AIRPORT_ID,
            hubAircraft: [],
            hubPassengers: [],
          } as GameState;
        }
        return {
          ...prev,
          flight: prev.flight ?? null,
          flightOverlay: false,
          flightHistory: prev.flightHistory ?? [],
          currentAirportId: prev.currentAirportId ?? HOME_AIRPORT_ID,
          hubAircraft: [],
          hubPassengers: [],
        } as GameState;
      },
      merge: (persisted, current) => {
        const prev = (persisted ?? {}) as Partial<GameState>;
        const savedAirport = prev.currentAirportId ?? HOME_AIRPORT_ID;
        const currentAirportId = DESTINATION_BY_ID[savedAirport] ? savedAirport : HOME_AIRPORT_ID;
        const traffic = isHomeAirport(currentAirportId) ? { aircraft: [], passengers: [] } : seedHubTraffic(currentAirportId);
        const flightValid =
          prev.flight && DESTINATION_BY_ID[prev.flight.destinationId] && DESTINATION_BY_ID[prev.flight.originId];
        const aircraft = flightValid
          ? prev.aircraft
          : prev.aircraft?.map((a) => (a.controlledBy === "player" ? { ...a, controlledBy: undefined } : a));
        return {
          ...current,
          ...prev,
          ...(aircraft ? { aircraft } : {}),
          flight: flightValid ? prev.flight! : null,
          flightOverlay: false,
          flightHistory: prev.flightHistory ?? [],
          currentAirportId,
          hubAircraft: traffic.aircraft,
          hubPassengers: traffic.passengers,
        };
      },
      partialize: (s) => ({
        airportName: s.airportName,
        welcome: s.welcome,
        minutes: s.minutes,
        cash: s.cash,
        buildings: s.buildings,
        staff: s.staff,
        flights: s.flights,
        aircraft: s.aircraft,
        passengers: s.passengers,
        ledger: s.ledger,
        unlockedAirlines: s.unlockedAirlines,
        stats: s.stats,
        flight: s.flight,
        flightHistory: s.flightHistory,
        currentAirportId: s.currentAirportId,
      }),
    },
  ),
);

export function paintCells(type: BuildId, x0: number, y0: number, x1: number, y1: number) {
  const { cash, place } = useGame.getState();
  const def = BUILD_BY_ID[type];
  if (!def.paint) {
    place(x0, y0);
    return;
  }
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  let spent = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (spent + def.cost > cash) return;
      if (canPlace(useGame.getState().buildings, type, x, y, false)) {
        useGame.getState().place(x, y);
        spent += def.cost;
      }
    }
  }
}

export function cellsUnderCursor(x: number, y: number) {
  const { selectedTool, rotate } = useGame.getState();
  if (!selectedTool || selectedTool === "demolish") return cellsOf(x, y, 1, 1);
  const { w, h } = footprint(selectedTool, rotate);
  return cellsOf(x, y, w, h);
}
