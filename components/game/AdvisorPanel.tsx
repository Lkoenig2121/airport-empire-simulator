"use client";

import { useState } from "react";
import { getAdvice, getMilestones } from "@/lib/game/advisor";
import { DESTINATION_BY_ID } from "@/lib/flight/destinations";
import { isHomeAirport } from "@/lib/game/hubs";
import { useGame } from "@/lib/game/store";

const WHY: Record<string, string> = {
  money: "Revenue",
  expand: "Grow the field",
  rating: "Rating",
  staff: "Staffing",
};

export function AdvisorPanel() {
  const buildings = useGame((s) => s.buildings);
  const staff = useGame((s) => s.staff);
  const cash = useGame((s) => s.cash);
  const unlockedAirlines = useGame((s) => s.unlockedAirlines);
  const stats = useGame((s) => s.stats);
  const setTool = useGame((s) => s.setTool);
  const setPanel = useGame((s) => s.setPanel);
  const currentAirportId = useGame((s) => s.currentAirportId);
  const [open, setOpen] = useState(true);
  const visiting = !isHomeAirport(currentAirportId);
  const hub = DESTINATION_BY_ID[currentAirportId];

  const advice = visiting
    ? []
    : getAdvice({ buildings, staff, cash, unlockedAirlines, stats });
  const milestones = getMilestones({ buildings, unlockedAirlines, stats });
  const next = milestones.find((m) => !m.done);

  return (
    <aside className="absolute top-24 left-1/2 z-20 w-[min(26rem,calc(100vw-24rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1412]/90 shadow-2xl backdrop-blur-md">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/80">
            Operations notes
          </div>
          <div className="text-sm font-semibold text-white">
            {visiting
              ? `Visiting ${hub?.name ?? "a hub"}`
              : next
                ? `Next: ${next.label}`
                : "The airfield is growing well"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:bg-white/8 hover:text-white"
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open ? (
        <div className="space-y-3 border-t border-white/10 px-4 py-3">
          {visiting ? (
            <p className="text-[12px] leading-relaxed text-white/65">
              {hub?.name} is a locked, fully built airport. You cannot edit it. Use Prev/Next or the map to fly the 60-second network, then return to Skyport to keep constructing your own field.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {milestones.map((item) => (
              <span
                key={item.id}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  item.done ? "bg-emerald-400/15 text-emerald-300" : "bg-white/6 text-white/40"
                }`}
              >
                {item.done ? "✓" : "○"} {item.label}
              </span>
            ))}
          </div>
          <div className="space-y-2">
            {advice.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => {
                  if (note.action?.panel) setPanel(note.action.panel);
                  if (note.action?.tool) setTool(note.action.tool);
                }}
                className="w-full rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-left hover:bg-white/8"
              >
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300/70">
                  {WHY[note.why]}
                </div>
                <div className="text-sm font-semibold text-white">{note.title}</div>
                <div className="mt-0.5 text-[12px] leading-snug text-white/55">{note.detail}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
