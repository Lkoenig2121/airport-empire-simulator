"use client";

import { useEffect, useMemo, useState } from "react";
import { DESTINATIONS, DESTINATION_BY_ID, displayNm, navDistance } from "@/lib/flight/destinations";
import {
  canSelectDestination,
  flightProgress,
  guidance,
  headingDegrees,
  phaseLabel,
  remainingTime,
} from "@/lib/flight/engine";
import { bindFlightKeys } from "@/lib/flight/input";
import { FLIGHT_PAYOUT, HOME_AIRPORT_ID, TARGET_FLIGHT_DURATION_SECONDS, type FlightPhase } from "@/lib/flight/types";
import type { CameraMode } from "@/lib/flight/render3d";
import { useGame } from "@/lib/game/store";
import { FlightView3D } from "./FlightView3D";
import { MobileControls } from "./MobileControls";
import { NavMap } from "./NavMap";

const PHASE_TONE: Record<FlightPhase, string> = {
  preparing: "bg-white/15 text-white",
  takeoff: "bg-sky-400/25 text-sky-100",
  enroute: "bg-emerald-400/20 text-emerald-100",
  approaching: "bg-amber-400/25 text-amber-100",
  arriving: "bg-orange-400/30 text-orange-50",
  completed: "bg-lime-400/25 text-lime-100",
};

export function FlightShell() {
  const flight = useGame((s) => s.flight);
  const history = useGame((s) => s.flightHistory);
  const tickFlight = useGame((s) => s.tickFlight);
  const setFlightView = useGame((s) => s.setFlightView);
  const setFlightSearch = useGame((s) => s.setFlightSearch);
  const setFlightDestination = useGame((s) => s.setFlightDestination);
  const startPlayerFlight = useGame((s) => s.startPlayerFlight);
  const toggleFlightPause = useGame((s) => s.toggleFlightPause);
  const exitToAirport = useGame((s) => s.exitToAirport);
  const continueFlight = useGame((s) => s.continueFlight);
  const abandonFlight = useGame((s) => s.abandonFlight);
  const [notice, setNotice] = useState<string | null>(null);
  const [camMode, setCamMode] = useState<CameraMode>("chase");

  useEffect(() => {
    const unbind = bindFlightKeys();
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tickFlight(dt);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => {
      unbind();
      cancelAnimationFrame(id);
    };
  }, [tickFlight]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        event.stopPropagation();
        toggleFlightPause();
      }
      if (event.code === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!flight) return;
        setFlightView(flight.view === "menu" ? "cockpit" : "menu");
      }
      if (event.code === "KeyC" && !(event.target instanceof HTMLInputElement)) {
        setCamMode((m) => (m === "chase" ? "cockpit" : "chase"));
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [flight, setFlightView, toggleFlightPause]);

  if (!flight) return null;

  const dest = DESTINATION_BY_ID[flight.destinationId];
  const nav = guidance(flight);
  const progress = flightProgress(flight.elapsed, flight.targetDuration);
  const left = remainingTime(flight);
  const heading = headingDegrees(flight.craft.heading);
  const view = flight.view;

  const pickDest = (id: string) => {
    const result = setFlightDestination(id);
    setNotice(result.ok ? `Target set: ${DESTINATION_BY_ID[id]?.name ?? id}` : result.reason);
  };

  const start = () => {
    const result = startPlayerFlight();
    setNotice(result.ok ? "Cleared for departure." : result.reason);
  };

  const bearing = relativeBearing(nav.heading, flight.craft.heading);
  const late = flight.phase === "approaching" || flight.phase === "arriving";

  return (
    <div className="absolute inset-0 z-40 overflow-hidden bg-[#9cc4e4] text-white">
      <FlightView3D flight={flight} mode={camMode} />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="pointer-events-auto w-[min(21rem,calc(100vw-1.5rem))] rounded-2xl border border-white/15 bg-black/45 px-3.5 py-2.5 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${PHASE_TONE[flight.phase]}`}>
                {phaseLabel(flight.phase)}
                {flight.paused ? " · Paused" : ""}
              </span>
              <span className="font-mono text-[11px] text-white/70">
                {Math.round(flight.elapsed)}s / {flight.targetDuration}s
              </span>
            </div>
            <div className="mt-1.5 truncate text-base font-semibold">{dest?.name ?? "No destination"}</div>
            <div className="text-[11px] text-white/65">
              {displayNm(nav.distance)} nm left · {Math.ceil(left)}s remaining · {Math.round(progress * 100)}%
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className={`h-full ${late ? "bg-amber-300" : "bg-emerald-400"}`} style={{ width: `${progress * 100}%` }} />
            </div>
            {notice ? <div className="mt-1.5 text-[11px] text-amber-200">{notice}</div> : null}
          </div>

          <div className="pointer-events-auto flex flex-wrap justify-end gap-1.5">
            <HudButton onClick={() => setCamMode(camMode === "chase" ? "cockpit" : "chase")}>
              {camMode === "chase" ? "Cockpit view" : "Chase view"}
            </HudButton>
            <HudButton onClick={() => setFlightView("map")}>Map</HudButton>
            <HudButton onClick={() => setFlightView("planner")}>Destinations</HudButton>
            <HudButton onClick={() => setFlightView("history")}>History</HudButton>
            <HudButton onClick={exitToAirport}>Enter Airport</HudButton>
            <HudButton onClick={() => setFlightView("menu")}>Menu</HudButton>
          </div>
        </div>

        {flight.started && flight.phase !== "completed" ? (
          <div className="pointer-events-none absolute top-24 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-xs backdrop-blur sm:flex">
            <span
              className="inline-block text-amber-300"
              style={{ transform: `rotate(${(bearing * 180) / Math.PI}deg)` }}
            >
              ➤
            </span>
            <span>
              Steer {headingDegrees(nav.heading).toString().padStart(3, "0")}°
              {Math.abs(bearing) < 0.15 ? " · on course" : bearing > 0 ? " · turn right" : " · turn left"}
            </span>
          </div>
        ) : null}

        <div className="flex items-end justify-between gap-3">
          <div className="pointer-events-auto space-y-2">
            <div className="flex gap-1.5">
              <Instrument label="IAS" value={`${Math.round(flight.craft.airspeed)}`} unit="kt" />
              <Instrument label="ALT" value={Math.round(flight.craft.alt).toLocaleString()} unit="ft" />
              <Instrument label="HDG" value={heading.toString().padStart(3, "0")} unit="°" />
            </div>
            <div className="w-[min(18rem,calc(100vw-1.5rem))] rounded-xl bg-black/40 px-3 py-2 backdrop-blur">
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/50">
                <span>Throttle</span>
                <span>{Math.round(flight.craft.throttle * 100)}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
                <div className="h-full bg-sky-300" style={{ width: `${flight.craft.throttle * 100}%` }} />
              </div>
              <div className="mt-1.5 hidden text-[10px] text-white/50 md:block">
                W/S throttle · A/D turn · ↑↓ pitch · ←→ bank · C view · Space pause · Esc menu
              </div>
            </div>
            <MobileControls />
          </div>
          <div className="pointer-events-auto hidden w-64 sm:block">
            <NavMap flight={flight} compact onPick={pickDest} />
          </div>
        </div>
      </div>

      {view !== "cockpit" ? (
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/55 p-3 sm:items-center">
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-auto rounded-2xl border border-white/10 bg-[#0d1714] p-4 shadow-2xl">
            {view === "menu" ? (
              <Menu
                paused={flight.paused}
                started={flight.started}
                completed={flight.phase === "completed"}
                onResume={() => setFlightView("cockpit")}
                onPause={toggleFlightPause}
                onMap={() => setFlightView("map")}
                onPlanner={() => setFlightView("planner")}
                onHistory={() => setFlightView("history")}
                onAirport={exitToAirport}
                onAbandon={abandonFlight}
                onContinue={continueFlight}
              />
            ) : null}
            {view === "map" ? (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Navigation map</h2>
                <NavMap flight={flight} onPick={pickDest} />
                <button type="button" className="rounded-lg bg-white/10 px-3 py-2 text-sm" onClick={() => setFlightView("cockpit")}>
                  Back to cockpit
                </button>
              </div>
            ) : null}
            {view === "planner" ? (
              <Planner
                originId={flight.originId}
                destinationId={flight.destinationId}
                search={flight.search}
                started={flight.started}
                elapsed={flight.elapsed}
                onSearch={setFlightSearch}
                onPick={pickDest}
                onStart={start}
                onCancel={() => setFlightView("cockpit")}
              />
            ) : null}
            {view === "history" ? (
              <HistoryList entries={history} onClose={() => setFlightView("cockpit")} />
            ) : null}
          </div>
        </div>
      ) : null}

      {flight.phase === "completed" && view === "cockpit" ? (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#102018] p-5 text-center">
            <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300">Arrival</div>
            <h2 className="mt-1 text-2xl font-semibold">Welcome to {dest?.name}</h2>
            <p className="mt-2 text-sm text-white/65">
              {dest?.hasRunway ? "Automated landing complete." : "Arrived at the destination area."} Flight time {Math.round(flight.elapsed)}s.
            </p>
            {flight.originId === HOME_AIRPORT_ID ? (
              <div className="mt-3 rounded-xl bg-emerald-400/15 px-3 py-2 text-lg font-semibold text-emerald-300">
                +${FLIGHT_PAYOUT.toLocaleString()} earned
              </div>
            ) : null}
            <div className="mt-4 grid gap-2">
              <button type="button" className="rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-semibold text-black" onClick={continueFlight}>
                Continue flying
              </button>
              <button type="button" className="rounded-xl bg-white/10 px-4 py-2.5 text-sm" onClick={() => setFlightView("planner")}>
                Choose another destination
              </button>
              <button type="button" className="rounded-xl bg-white/10 px-4 py-2.5 text-sm" onClick={exitToAirport}>
                Enter Airport
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function relativeBearing(target: number, current: number) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function HudButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-white/15 bg-black/45 px-3 py-1.5 text-xs font-semibold text-white shadow backdrop-blur hover:bg-black/60"
    >
      {children}
    </button>
  );
}

function Instrument({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="min-w-22 rounded-xl border border-white/15 bg-black/45 px-3 py-1.5 backdrop-blur">
      <div className="text-[9px] font-bold uppercase tracking-widest text-white/50">{label}</div>
      <div className="font-mono text-lg leading-tight">
        {value}
        <span className="ml-0.5 text-[10px] text-white/50">{unit}</span>
      </div>
    </div>
  );
}

function Menu({
  paused,
  started,
  completed,
  onResume,
  onPause,
  onMap,
  onPlanner,
  onHistory,
  onAirport,
  onAbandon,
  onContinue,
}: {
  paused: boolean;
  started: boolean;
  completed: boolean;
  onResume: () => void;
  onPause: () => void;
  onMap: () => void;
  onPlanner: () => void;
  onHistory: () => void;
  onAirport: () => void;
  onAbandon: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Flight menu</h2>
      <button type="button" className="w-full rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-semibold text-black" onClick={onResume}>
        Resume cockpit
      </button>
      {started && !completed ? (
        <button type="button" className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm" onClick={onPause}>
          {paused ? "Resume flight timer" : "Pause flight"}
        </button>
      ) : null}
      {completed ? (
        <button type="button" className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm" onClick={onContinue}>
          Continue flying
        </button>
      ) : null}
      <button type="button" className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm" onClick={onMap}>
        Navigation map
      </button>
      <button type="button" className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm" onClick={onPlanner}>
        Flight planner
      </button>
      <button type="button" className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm" onClick={onHistory}>
        Flight history
      </button>
      <button type="button" className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm" onClick={onAirport}>
        Enter Airport
      </button>
      <button type="button" className="w-full rounded-xl bg-rose-500/20 px-4 py-2.5 text-sm text-rose-100" onClick={onAbandon}>
        End flight
      </button>
    </div>
  );
}

function Planner({
  originId,
  destinationId,
  search,
  started,
  elapsed,
  onSearch,
  onPick,
  onStart,
  onCancel,
}: {
  originId: string;
  destinationId: string;
  search: string;
  started: boolean;
  elapsed: number;
  onSearch: (q: string) => void;
  onPick: (id: string) => void;
  onStart: () => void;
  onCancel: () => void;
}) {
  const origin = DESTINATION_BY_ID[originId];
  const dest = DESTINATION_BY_ID[destinationId];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DESTINATIONS.filter((d) => !q || d.name.toLowerCase().includes(q) || d.region.includes(q));
  }, [search]);
  const check = dest ? canSelectDestination(originId, dest.id) : { ok: false, reason: "Select a destination." };
  const dist = origin && dest ? displayNm(navDistance(origin, dest)) : 0;
  const remaining = Math.max(1, Math.round(TARGET_FLIGHT_DURATION_SECONDS - elapsed));

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Flight planner</h2>
      <p className="text-sm text-white/60">
        {origin?.name ?? "Unknown"} → {dest?.name ?? "Select a destination"} · {dist} nm · {started ? `${remaining}s remaining` : `${TARGET_FLIGHT_DURATION_SECONDS}s target`}
      </p>
      {!check.ok && !started ? <p className="text-sm text-rose-300">{check.reason}</p> : null}
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search airports"
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
      />
      <div className="max-h-56 space-y-1 overflow-auto">
        {filtered.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onPick(d.id)}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${d.id === destinationId ? "bg-amber-300 text-black" : "bg-white/5 hover:bg-white/10"}`}
          >
            <span>
              {d.name}
              <span className="ml-2 text-[10px] uppercase tracking-wider opacity-70">{d.region}</span>
            </span>
            <span>{origin ? `${displayNm(navDistance(origin, d))} nm` : ""}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {!started ? (
          <button type="button" className="flex-1 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-40" onClick={onStart} disabled={!check.ok}>
            Start 60s flight
          </button>
        ) : (
          <button type="button" className="flex-1 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-semibold text-black" onClick={onCancel}>
            Keep flying
          </button>
        )}
        <button type="button" className="rounded-xl bg-white/10 px-4 py-2.5 text-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function HistoryList({
  entries,
  onClose,
}: {
  entries: ReturnType<typeof useGame.getState>["flightHistory"];
  onClose: () => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Flight history</h2>
      {entries.length === 0 ? <p className="text-sm text-white/55">No completed flights yet.</p> : null}
      <div className="max-h-72 space-y-2 overflow-auto">
        {entries.map((e) => (
          <div key={e.id} className="rounded-xl bg-white/5 px-3 py-2 text-sm">
            <div className="font-semibold">{e.flightNo}</div>
            <div className="text-white/65">
              {DESTINATION_BY_ID[e.originId]?.name ?? e.originId} → {DESTINATION_BY_ID[e.destinationId]?.name ?? e.destinationId}
            </div>
            <div className="text-[11px] text-white/45">
              {Math.round(e.duration)}s · {e.distance} nm · {e.status} · {e.aircraftId}
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="rounded-xl bg-white/10 px-4 py-2 text-sm" onClick={onClose}>
        Back to cockpit
      </button>
    </div>
  );
}
