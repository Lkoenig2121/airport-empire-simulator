"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { BottomDock } from "./BottomDock";
import { BuildPanel } from "./BuildPanel";
import {
  AnalyticsPanel,
  FinancePanel,
  FlightsPanel,
  StaffPanel,
} from "./ManagementPanels";
import { AdvisorPanel } from "./AdvisorPanel";
import { InspectPanel } from "./InspectPanel";
import { NewGameButton, Notices, WelcomeOverlay } from "./Overlays";
import { AirportSwitcher } from "./AirportSwitcher";
import { TopBar } from "./TopBar";
import { FlightShell } from "@/components/flight/FlightShell";
import { useGame } from "@/lib/game/store";

const AirportCanvas = dynamic(() => import("./AirportCanvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center bg-[#fffaf2] text-sm tracking-[0.2em] text-stone-500 uppercase">
      Preparing airfield…
    </div>
  ),
});

export default function GameApp() {
  const [ready, setReady] = useState(false);
  const setTool = useGame((s) => s.setTool);
  const toggleRotate = useGame((s) => s.toggleRotate);
  const setSpeed = useGame((s) => s.setSpeed);
  const speed = useGame((s) => s.speed);
  const setPanel = useGame((s) => s.setPanel);
  const clearInspect = useGame((s) => s.clearInspect);
  const flightOverlay = useGame((s) => s.flightOverlay);
  const flight = useGame((s) => s.flight);
  const resumeCockpit = useGame((s) => s.resumeCockpit);

  useEffect(() => {
    const unsub = useGame.persist.onFinishHydration(() => setReady(true));
    if (useGame.persist.hasHydrated()) setReady(true);
    const fallback = window.setTimeout(() => setReady(true), 400);
    return () => {
      unsub();
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (useGame.getState().flightOverlay) return;
      if (event.key === "Escape") {
        setTool(null);
        clearInspect();
      }
      if (event.key === "r" || event.key === "R") toggleRotate();
      if (event.key === " ") {
        event.preventDefault();
        setSpeed(speed === 0 ? 1 : 0);
      }
      if (event.key === "1") setPanel("flights");
      if (event.key === "2") setPanel("build");
      if (event.key === "3") setPanel("staff");
      if (event.key === "4") setPanel("finance");
      if (event.key === "5") setPanel("analytics");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearInspect, setPanel, setSpeed, setTool, speed, toggleRotate]);

  if (!ready) {
    return (
      <div className="grid h-dvh place-items-center bg-[#fffaf2] text-sm uppercase tracking-[0.2em] text-stone-500">
        Loading airfield…
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#fffaf2] text-zinc-100">
      <AirportCanvas />
      <TopBar />
      <BuildPanel />
      <AdvisorPanel />
      <InspectPanel />
      <FlightsPanel />
      <StaffPanel />
      <FinancePanel />
      <AnalyticsPanel />
      <Notices />
      <AirportSwitcher />
      <BottomDock />
      <NewGameButton />
      <WelcomeOverlay />
      {flight && !flightOverlay ? (
        <button
          type="button"
          onClick={resumeCockpit}
          className="absolute bottom-24 left-3 z-30 rounded-xl bg-amber-300 px-3 py-2 text-xs font-semibold text-black shadow-lg"
        >
          Return to cockpit · {flight.flightNo}
        </button>
      ) : null}
      {flightOverlay ? <FlightShell /> : null}
    </div>
  );
}
