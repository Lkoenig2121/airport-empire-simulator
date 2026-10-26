"use client";

import { BUILD_BY_ID } from "@/lib/game/catalog";
import { formatFullCash } from "@/lib/game/iso";
import { inspectSummary } from "@/lib/game/inspect";
import { placementCost } from "@/lib/game/simulation";
import { useGame } from "@/lib/game/store";

function Meter({
  label,
  current,
  max,
  empty,
}: {
  label: string;
  current: number;
  max: number;
  empty: string;
}) {
  if (max <= 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2">
        <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
        <div className="mt-1 text-sm text-white/70">{empty}</div>
      </div>
    );
  }
  const ratio = Math.min(1, current / max);
  const crowded = ratio >= 0.85;
  return (
    <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/40">
        <span>{label}</span>
        <span className={crowded ? "text-rose-300" : "text-white/55"}>
          {current} / {max}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${crowded ? "bg-rose-400" : "bg-amber-300"}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

export function InspectPanel() {
  const inspect = useGame((s) => s.inspect);
  const buildings = useGame((s) => s.buildings);
  const passengers = useGame((s) => s.passengers);
  const aircraft = useGame((s) => s.aircraft);
  const flights = useGame((s) => s.flights);
  const clear = useGame((s) => s.clearInspect);
  const sellBuilding = useGame((s) => s.sellBuilding);
  if (!inspect) return null;

  const info = inspectSummary(inspect, buildings, passengers, aircraft, flights);
  if (!info) return null;

  const selectedBuilding =
    inspect.kind === "building" ? buildings.find((b) => b.id === inspect.id) : null;
  const refund = selectedBuilding
    ? Math.round(placementCost(selectedBuilding.type, selectedBuilding.w, selectedBuilding.h) * 0.4)
    : 0;

  return (
    <aside className="absolute top-24 right-3 z-20 w-[22rem] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1412]/92 shadow-2xl backdrop-blur-md">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/80">
            {info.kicker}
          </div>
          <div className="text-lg font-semibold text-white">{info.title}</div>
        </div>
        <button
          type="button"
          onClick={clear}
          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:bg-white/8 hover:text-white"
        >
          Close
        </button>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-sm leading-relaxed text-white/70">{info.purpose}</p>
        <p className="text-[12px] leading-relaxed text-white/45">{info.description}</p>
        <div className="grid grid-cols-2 gap-2">
          <Meter
            label="People inside"
            current={info.people.current}
            max={info.people.max}
            empty="No passenger space"
          />
          <Meter
            label="Aircraft"
            current={info.aircraft.current}
            max={info.aircraft.max}
            empty="No aircraft stand"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded-xl bg-white/4 px-3 py-2 text-white/60">
            Size
            <div className="mt-0.5 font-mono text-white">{info.size}</div>
          </div>
          <div className="rounded-xl bg-white/4 px-3 py-2 text-white/60">
            Notes
            <div className="mt-0.5 text-white">{info.cost}</div>
          </div>
        </div>
        <div className="text-[12px] text-white/45">{info.extra}</div>
        {selectedBuilding ? (
          <button
            type="button"
            onClick={() => sellBuilding(selectedBuilding.id)}
            className="w-full rounded-xl border border-rose-400/40 bg-rose-500/20 px-3 py-2.5 text-sm font-semibold text-rose-100 hover:bg-rose-500/30"
          >
            Sell {BUILD_BY_ID[selectedBuilding.type].name} · {formatFullCash(refund)} back
          </button>
        ) : null}
      </div>
    </aside>
  );
}
