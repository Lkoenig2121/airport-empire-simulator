"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  };
};

export const useGame = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...fresh(),

      tick: (dtSec) => {
        const patch = advanceSimulation(get(), dtSec);
        if (!Object.keys(patch).length) return;
        const current = get();
        if (patch.aircraft) current.aircraft = patch.aircraft;
        if (patch.passengers) current.passengers = patch.passengers;
        if (patch.minutes !== undefined) current.minutes = patch.minutes;
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
      setTool: (tool) => set({ selectedTool: tool, panel: "build", inspect: null }),
      inspectAt: (x, y) => {
        const { buildings, aircraft, panel } = get();
        const inspect = resolveInspect(x, y, buildings, aircraft);
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
        if (!selectedTool || selectedTool === "demolish") return false;
        if (!canPlace(buildings, selectedTool, x, y, rotate)) return false;
        const { w, h } = footprint(selectedTool, rotate);
        const cost = placementCost(selectedTool, w, h);
        if (cash < cost) {
          set({
            notices: [
              {
                id: uid("note"),
                kind: "warn",
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
        const hit = occupiedMap(get().buildings).get(`${x},${y}`);
        if (hit) get().sellBuilding(hit.id);
      },

      sellBuilding: (id) => {
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
              kind: "money",
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
              kind: "info",
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
    }),
    {
      name: "airport-empire-save",
      version: 2,
      migrate: (persisted) => {
        const prev = persisted as Partial<GameState>;
        const airportName = prev.airportName ?? "Skyport International";
        return {
          ...prev,
          ...starterSlice(airportName),
          cash: prev.cash && prev.cash > 0 ? prev.cash : STARTING_CASH,
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
