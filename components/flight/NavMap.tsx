"use client";

import { useRef, useState } from "react";
import { DESTINATIONS, DESTINATION_BY_ID, displayNm, navDistance } from "@/lib/flight/destinations";
import { flightProgress, remainingTime } from "@/lib/flight/engine";
import type { FlightSession } from "@/lib/flight/types";

export function NavMap({
  flight,
  compact,
  onPick,
}: {
  flight: FlightSession;
  compact?: boolean;
  onPick?: (id: string) => void;
}) {
  const dest = DESTINATION_BY_ID[flight.destinationId];
  const origin = DESTINATION_BY_ID[flight.originId];
  const [cam, setCam] = useState({ x: 0, y: 0, z: compact ? 0.55 : 0.72 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  const to = (x: number, y: number) => ({
    x: 160 + (x - cam.x) * cam.z,
    y: (compact ? 70 : 150) + (y - cam.y) * cam.z,
  });

  const ac = to(flight.craft.x, flight.craft.y);
  const ds = dest ? to(dest.x, dest.y) : ac;
  const og = origin ? to(origin.x, origin.y) : ac;
  const left = remainingTime(flight);
  const progress = flightProgress(flight.elapsed, flight.targetDuration);
  const dist = dest ? displayNm(navDistance(flight.craft, dest)) : 0;

  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-[#0c1b16] ${compact ? "h-36" : "h-80"}`}>
      <svg
        className="h-full w-full touch-none"
        viewBox={compact ? "0 0 320 140" : "0 0 320 300"}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY };
          (e.target as Element).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current || compact) return;
          setCam((c) => ({
            ...c,
            x: c.x - (e.clientX - drag.current!.x) / c.z,
            y: c.y - (e.clientY - drag.current!.y) / c.z,
          }));
          drag.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        <rect width="100%" height="100%" fill="#10241c" />
        {DESTINATIONS.map((d) => {
          const p = to(d.x, d.y);
          return (
            <g
              key={d.id}
              onClick={(e) => {
                e.stopPropagation();
                onPick?.(d.id);
              }}
              className={onPick ? "cursor-pointer" : undefined}
            >
              <circle cx={p.x} cy={p.y} r={d.region === "home" ? 5 : 3.5} fill={d.id === flight.destinationId ? "#f5d76e" : "#7ec8d8"} />
              {!compact ? (
                <text x={p.x + 6} y={p.y + 3} fill="#d7ece4" fontSize="8">
                  {d.name}
                </text>
              ) : null}
            </g>
          );
        })}
        <line x1={og.x} y1={og.y} x2={ds.x} y2={ds.y} stroke="#f5d76e" strokeDasharray="4 3" strokeWidth="1.5" />
        <line x1={ac.x} y1={ac.y} x2={ds.x} y2={ds.y} stroke="#4ade80" strokeWidth="1.2" />
        <polygon
          transform={`translate(${ac.x} ${ac.y}) rotate(${(flight.craft.heading * 180) / Math.PI})`}
          points="0,-7 5,6 -5,6"
          fill="#fff"
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between bg-black/35 px-2 py-1 text-[10px] text-white/80">
        <span>{dest?.name ?? "No destination"}</span>
        <span>
          {dist} nm · {Math.ceil(left)}s · {Math.round(progress * 100)}%
        </span>
      </div>
      {!compact ? (
        <div className="absolute right-2 top-2 flex gap-1">
          <button type="button" className="rounded bg-white/10 px-2 py-1 text-[10px] text-white" onClick={() => setCam((c) => ({ ...c, z: Math.min(1.6, c.z * 1.15) }))}>
            +
          </button>
          <button type="button" className="rounded bg-white/10 px-2 py-1 text-[10px] text-white" onClick={() => setCam((c) => ({ ...c, z: Math.max(0.28, c.z / 1.15) }))}>
            −
          </button>
          <button
            type="button"
            className="rounded bg-white/10 px-2 py-1 text-[10px] text-white"
            onClick={() => setCam({ x: flight.craft.x, y: flight.craft.y, z: 0.8 })}
          >
            Center
          </button>
        </div>
      ) : null}
    </div>
  );
}
