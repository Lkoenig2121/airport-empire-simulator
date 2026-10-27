"use client";

import { DESTINATIONS } from "@/lib/flight/destinations";
import { useGame } from "@/lib/game/store";

export function AirportSwitcher() {
  const current = useGame((s) => s.currentAirportId);
  const cycleAirport = useGame((s) => s.cycleAirport);
  const flyToAirport = useGame((s) => s.flyToAirport);
  const overlay = useGame((s) => s.flightOverlay);
  const welcome = useGame((s) => s.welcome);
  if (welcome || overlay) return null;

  return (
    <div className="pointer-events-auto absolute bottom-20 left-1/2 z-30 flex w-[min(40rem,calc(100vw-8rem))] -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/10 bg-[#0b1412]/90 px-2 py-2 shadow-2xl backdrop-blur-md">
      <button
        type="button"
        className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/16"
        onClick={() => cycleAirport(-1)}
      >
        ← Prev
      </button>
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {DESTINATIONS.map((d) => {
          const here = d.id === current;
          return (
            <button
              key={d.id}
              type="button"
              title={`${d.name} · ${d.tagline}`}
              onClick={() => {
                if (!here) flyToAirport(d.id);
              }}
              className={`shrink-0 rounded-xl px-2.5 py-2 text-left ${
                here ? "bg-amber-300 text-black" : "bg-white/8 text-white hover:bg-white/14"
              }`}
            >
              <div className="text-[10px] font-bold tracking-widest">{d.code}</div>
              <div className="max-w-[7.5rem] truncate text-[11px]">{d.name}</div>
              <div className={`text-[9px] uppercase tracking-wider ${here ? "text-black/60" : "text-white/40"}`}>
                {d.editable ? "Yours" : "Read-only"}
              </div>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/16"
        onClick={() => cycleAirport(1)}
      >
        Next →
      </button>
    </div>
  );
}
