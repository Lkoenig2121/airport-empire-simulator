"use client";

import { useGame } from "@/lib/game/store";

export function WelcomeOverlay() {
  const welcome = useGame((s) => s.welcome);
  const dismiss = useGame((s) => s.dismissWelcome);
  if (!welcome) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/12 bg-[#0d1614] p-8 shadow-2xl">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-300/80">
          Airport Empire Simulator
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          A regional field is already flying
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Skyport opens with a runway, taxiway, gate, and terminal. Horizon Air
          flight 214 is on approach. Take over operations, then expand into
          shops, extra gates, and a bigger airfield.
        </p>
        <ol className="mt-5 space-y-2 text-sm text-white/75">
          <li>1. Watch the first arrival land and taxi to the gate.</li>
          <li>2. Open the Build catalog to add parking, cafes, and hangars.</li>
          <li>3. Hire staff and keep the books healthy as traffic grows.</li>
        </ol>
        <button
          type="button"
          onClick={dismiss}
          className="mt-6 w-full rounded-2xl bg-amber-300 px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-[#1a1408]"
        >
          Take control
        </button>
      </div>
    </div>
  );
}

export function Notices() {
  const notices = useGame((s) => s.notices);
  const dismiss = useGame((s) => s.dismissNotice);
  if (!notices.length) return null;

  return (
    <div className="pointer-events-none absolute right-3 bottom-20 z-20 flex w-52 flex-col-reverse gap-1.5">
      {notices.slice(0, 3).map((n) => (
        <button
          key={n.id}
          type="button"
          onClick={() => dismiss(n.id)}
          className="pointer-events-auto rounded-xl border border-white/10 bg-[#0b1412]/90 px-2.5 py-1.5 text-left shadow-lg backdrop-blur-md"
        >
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-300/75">
            {n.kind}
          </div>
          <div className="text-[11px] font-semibold leading-tight text-white">{n.title}</div>
          <div className="text-[10px] leading-snug text-white/50">{n.body}</div>
        </button>
      ))}
    </div>
  );
}

export function NewGameButton() {
  const reset = useGame((s) => s.newGame);
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm("Start a new airfield? The current save will be replaced.")) {
          reset();
        }
      }}
      className="pointer-events-auto absolute bottom-3 left-1/2 z-20 hidden -translate-x-1/2 rounded-full border border-white/10 bg-[#0b1412]/70 px-3 py-1 text-[10px] uppercase tracking-widest text-white/40 hover:text-white/70 md:left-auto md:right-[13.5rem] md:translate-x-0"
    >
      New game
    </button>
  );
}
