"use client";

import { useGame } from "@/lib/game/store";
import type { GameSpeed, PanelId } from "@/lib/game/types";

const TABS: { id: PanelId; label: string }[] = [
  { id: "flights", label: "Flights" },
  { id: "build", label: "Build" },
  { id: "staff", label: "Staff" },
  { id: "finance", label: "Finance" },
  { id: "analytics", label: "Analytics" },
];

export function BottomDock() {
  const panel = useGame((s) => s.panel);
  const setPanel = useGame((s) => s.setPanel);
  const speed = useGame((s) => s.speed);
  const setSpeed = useGame((s) => s.setSpeed);
  const rotate = useGame((s) => s.rotate);
  const toggleRotate = useGame((s) => s.toggleRotate);
  const tool = useGame((s) => s.selectedTool);

  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 p-3">
      <div className="pointer-events-auto rounded-2xl border border-white/10 bg-[#0b1412]/86 px-3 py-2 text-[11px] text-white/55 shadow-2xl backdrop-blur-md">
        Click to inspect · Arrows or right-click to pan · Scroll to zoom · R rotate · Esc cancel
        {tool && tool !== "demolish" ? (
          <span className="ml-2 text-amber-200/80">
            {rotate ? "Rotated" : "Default orientation"}
          </span>
        ) : null}
      </div>

      <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-white/10 bg-[#0b1412]/86 p-1.5 shadow-2xl backdrop-blur-md">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPanel(panel === tab.id ? "none" : tab.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold tracking-wide transition ${
              panel === tab.id
                ? "bg-amber-300 text-[#1a1408]"
                : "text-white/75 hover:bg-white/8 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-white/10 bg-[#0b1412]/86 p-1.5 shadow-2xl backdrop-blur-md">
        <button
          type="button"
          onClick={toggleRotate}
          className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-widest text-white/70 hover:bg-white/8"
        >
          Rotate
        </button>
        {([0, 1, 2, 3] as GameSpeed[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeed(s)}
            className={`min-w-10 rounded-xl px-3 py-2 text-sm font-bold ${
              speed === s ? "bg-white text-[#111]" : "text-white/70 hover:bg-white/8"
            }`}
          >
            {s === 0 ? "❚❚" : s === 1 ? "▶" : s === 2 ? "▶▶" : "▶▶▶"}
          </button>
        ))}
      </div>
    </footer>
  );
}
