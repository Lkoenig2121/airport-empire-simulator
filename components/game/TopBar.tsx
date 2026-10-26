"use client";

import { countType, isOperational } from "@/lib/game/simulation";
import { formatCash, formatClock } from "@/lib/game/iso";
import { progressionLabel } from "@/lib/game/catalog";
import { useGame } from "@/lib/game/store";

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="min-w-[7.5rem] border-l border-white/10 px-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
        {label}
      </div>
      <div className={`mt-0.5 font-mono text-lg leading-none ${accent ?? "text-white"}`}>
        {value}
      </div>
    </div>
  );
}

export function TopBar() {
  const name = useGame((s) => s.airportName);
  const cash = useGame((s) => s.cash);
  const minutes = useGame((s) => s.minutes);
  const stats = useGame((s) => s.stats);
  const flights = useGame((s) => s.flights);
  const buildings = useGame((s) => s.buildings);
  const clock = formatClock(minutes);
  const active = flights.filter((f) => f.status !== "departed" && f.status !== "cancelled").length;
  const open = isOperational(buildings);
  const era = progressionLabel(
    countType(buildings, "runway"),
    countType(buildings, "terminal"),
    countType(buildings, "gate"),
  );

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 p-3">
      <div className="pointer-events-auto flex items-center gap-4 rounded-2xl border border-white/10 bg-[#0b1412]/82 px-4 py-2.5 shadow-2xl backdrop-blur-md">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300/80">
            Airport Empire
          </div>
          <div className="font-semibold tracking-tight text-white">{name}</div>
          <div className="text-[11px] text-white/50">{era}</div>
        </div>
        <div
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
            open
              ? "bg-emerald-400/15 text-emerald-300"
              : "bg-white/8 text-white/55"
          }`}
        >
          {open ? "Operating" : "Planning"}
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm("Start a new airfield? The current save will be replaced.")) {
              useGame.getState().newGame();
            }
          }}
          className="rounded-full px-2 py-1 text-[10px] uppercase tracking-widest text-white/35 hover:text-white/70"
        >
          New
        </button>
      </div>

      <div className="pointer-events-auto flex items-center rounded-2xl border border-white/10 bg-[#0b1412]/82 py-2.5 pr-4 shadow-2xl backdrop-blur-md">
        <Stat
          label="Cash balance"
          value={formatCash(cash)}
          accent={cash < 50_000 ? "text-rose-300" : "text-amber-200"}
        />
        <Stat label="Passengers today" value={stats.passengersToday.toLocaleString()} />
        <Stat label="Active flights" value={String(active)} />
        <Stat
          label="Passenger rating"
          value={open ? `${stats.rating}/100` : "—"}
          accent={stats.rating >= 80 ? "text-emerald-300" : "text-white"}
        />
      </div>

      <div className="pointer-events-auto rounded-2xl border border-white/10 bg-[#0b1412]/82 px-4 py-2.5 text-right shadow-2xl backdrop-blur-md">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
          Day {clock.day}
        </div>
        <div className="font-mono text-lg text-white">{clock.clock}</div>
      </div>
    </header>
  );
}
