"use client";

import { useEffect, useRef, useState } from "react";
import { BUILDINGS, categoryLabel } from "@/lib/game/catalog";
import { formatFullCash } from "@/lib/game/iso";
import { DESTINATION_BY_ID } from "@/lib/flight/destinations";
import { isHomeAirport } from "@/lib/game/hubs";
import { useGame } from "@/lib/game/store";
import type { BuildCategory } from "@/lib/game/types";

const ORDER: BuildCategory[] = ["airside", "terminal", "landside", "commercial"];

function CatalogScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; startTop: number } | null>(null);
  const [thumb, setThumb] = useState({ top: 0, height: 48 });

  const metrics = () => {
    const el = ref.current;
    if (!el) return null;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const track = Math.max(clientHeight - 16, 1);
    if (scrollHeight <= clientHeight) {
      return { el, scrollTop, scrollHeight, clientHeight, track, height: track, top: 0, maxTop: 0 };
    }
    const height = Math.max(36, (clientHeight / scrollHeight) * track);
    const maxTop = track - height;
    const top = (scrollTop / (scrollHeight - clientHeight)) * maxTop;
    return { el, scrollTop, scrollHeight, clientHeight, track, height, top, maxTop };
  };

  const update = () => {
    const m = metrics();
    if (!m) return;
    setThumb({ top: m.top, height: m.height });
  };

  const scrollToRatio = (ratio: number) => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    el.scrollTop = Math.max(0, Math.min(max, ratio * max));
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update);
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!drag.current) return;
      const m = metrics();
      if (!m || m.maxTop <= 0) return;
      const nextTop = Math.max(
        0,
        Math.min(m.maxTop, drag.current.startTop + (event.clientY - drag.current.startY)),
      );
      scrollToRatio(nextTop / m.maxTop);
    };
    const onUp = () => {
      drag.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div className="flex min-h-0 flex-1" onWheel={(event) => event.stopPropagation()}>
      <div
        ref={ref}
        className="catalog-scroll min-h-0 flex-1 overflow-y-auto p-3 pr-2 [scrollbar-width:none] [-ms-overflow-style:none]"
      >
        {children}
      </div>
      <div
        ref={trackRef}
        className="relative my-2 mr-2 w-2.5 shrink-0 cursor-pointer rounded-full bg-white/35"
        onWheel={(event) => {
          event.stopPropagation();
          if (ref.current) ref.current.scrollTop += event.deltaY;
        }}
        onPointerDown={(event) => {
          const m = metrics();
          const trackBox = trackRef.current?.getBoundingClientRect();
          if (!m || !trackBox || m.maxTop <= 0) return;
          const y = event.clientY - trackBox.top - m.height / 2;
          const nextTop = Math.max(0, Math.min(m.maxTop, y));
          scrollToRatio(nextTop / m.maxTop);
          drag.current = { startY: event.clientY, startTop: nextTop };
          event.preventDefault();
        }}
      >
        <div
          className="absolute inset-x-0 cursor-grab rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
          style={{ top: thumb.top, height: thumb.height }}
        />
      </div>
    </div>
  );
}

export function BuildPanel() {
  const panel = useGame((s) => s.panel);
  const tool = useGame((s) => s.selectedTool);
  const setTool = useGame((s) => s.setTool);
  const cash = useGame((s) => s.cash);
  const currentAirportId = useGame((s) => s.currentAirportId);
  const [collapsed, setCollapsed] = useState(true);
  const visiting = !isHomeAirport(currentAirportId);
  const hub = DESTINATION_BY_ID[currentAirportId];

  useEffect(() => {
    if (window.innerWidth >= 1280) setCollapsed(false);
  }, []);

  if (panel !== "build") return null;

  const selected = BUILDINGS.find((b) => b.id === tool);
  const toolLabel = selected ? selected.name : "No tool selected";

  return (
    <aside
      className={`absolute top-24 left-3 z-20 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1412]/90 shadow-2xl backdrop-blur-md ${
        collapsed ? "w-72" : "bottom-20 w-80"
      }`}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/80">
            Construction
          </div>
          <div className="text-lg font-semibold text-white">{visiting ? "Visitor mode" : "Build catalog"}</div>
          {collapsed ? (
            <div className="mt-0.5 truncate text-[11px] text-white/50">{toolLabel}</div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((wasCollapsed) => !wasCollapsed)}
          className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:bg-white/8 hover:text-white"
        >
          {collapsed ? "Open" : "Hide"}
        </button>
      </div>
      {!collapsed && visiting ? (
        <div className="p-4 text-sm leading-relaxed text-white/70">
          <p>
            {hub?.name ?? "This hub"} is a finished rival airport. You can inspect it, pilot aircraft, and fly the network, but you cannot place, sell, or demolish anything here.
          </p>
          <p className="mt-2 text-white/45">{hub?.tagline}</p>
        </div>
      ) : null}
      {!collapsed && !visiting ? (
        <CatalogScroll>
          {ORDER.map((category) => (
            <div key={category} className="mb-4">
              <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                {categoryLabel(category)}
              </div>
              <div className="space-y-1.5">
                {BUILDINGS.filter((b) => b.category === category).map((b) => {
                  const isSelected = tool === b.id;
                  const unaffordable = cash < b.cost;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setTool(isSelected ? null : b.id)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                        isSelected
                          ? "border-amber-300/60 bg-amber-300/15"
                          : "border-white/8 bg-white/4 hover:bg-white/8"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-white">{b.name}</div>
                          <div className="mt-0.5 text-[11px] leading-snug text-white/50">
                            {b.description}
                          </div>
                        </div>
                        <div
                          className={`shrink-0 font-mono text-sm ${
                            unaffordable ? "text-rose-300" : "text-amber-200"
                          }`}
                        >
                          {formatFullCash(b.cost)}
                        </div>
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-wider text-white/35">
                        {b.w}×{b.h}
                        {b.paint ? " · paint" : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </CatalogScroll>
      ) : null}
    </aside>
  );
}
