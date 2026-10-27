"use client";

import { useEffect, useRef } from "react";
import { DESTINATIONS, DESTINATION_BY_ID, displayNm, navDistance } from "@/lib/flight/destinations";
import { lerpAngle } from "@/lib/flight/engine";
import { renderScene, type CameraMode } from "@/lib/flight/render3d";
import { HOME_AIRPORT_ID, type FlightSession } from "@/lib/flight/types";
import { hubBuildings } from "@/lib/game/hubs";
import { useGame } from "@/lib/game/store";

export function FlightView3D({ flight, mode }: { flight: FlightSession; mode: CameraMode }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const flightRef = useRef(flight);
  const modeRef = useRef(mode);
  flightRef.current = flight;
  modeRef.current = mode;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let camHeading = flightRef.current.craft.heading;
    let last = performance.now();
    let id = 0;

    const buildingsFor = (airportId: string) =>
      airportId === HOME_AIRPORT_ID ? useGame.getState().buildings : hubBuildings(airportId);

    const draw = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const parent = canvas.parentElement;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = parent?.clientWidth ?? 800;
      const h = parent?.clientHeight ?? 500;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      const current = flightRef.current;
      camHeading = lerpAngle(camHeading, current.craft.heading, 1 - Math.exp(-dt * 2.6));
      const dest = DESTINATION_BY_ID[current.destinationId];
      const tint =
        current.phase === "arriving" || current.phase === "completed"
          ? "arrive"
          : current.phase === "approaching"
            ? "approach"
            : "normal";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderScene(ctx, w, h, {
        craft: current.craft,
        mode: modeRef.current,
        camHeading,
        time: now / 1000,
        destinations: DESTINATIONS,
        targetId: current.destinationId,
        buildingsFor,
        distanceLabel: dest ? `${displayNm(navDistance(current.craft, dest))} nm` : "",
        tint,
      });
      id = requestAnimationFrame(draw);
    };
    id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}
