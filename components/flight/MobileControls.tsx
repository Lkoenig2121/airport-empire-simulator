"use client";

import { resetTouchInput, setTouchInput } from "@/lib/flight/input";

function Hold({
  label,
  onHold,
}: {
  label: string;
  onHold: () => void;
}) {
  return (
    <button
      type="button"
      className="min-h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-semibold text-white active:bg-amber-300 active:text-black"
      onPointerDown={(e) => {
        e.preventDefault();
        onHold();
      }}
      onPointerUp={() => resetTouchInput()}
      onPointerLeave={() => resetTouchInput()}
    >
      {label}
    </button>
  );
}

export function MobileControls() {
  return (
    <div className="pointer-events-auto grid grid-cols-3 gap-2 md:hidden">
      <Hold label="Yaw L" onHold={() => setTouchInput({ yaw: -1 })} />
      <Hold label="Throttle +" onHold={() => setTouchInput({ throttle: 1 })} />
      <Hold label="Yaw R" onHold={() => setTouchInput({ yaw: 1 })} />
      <Hold label="Bank L" onHold={() => setTouchInput({ roll: -1 })} />
      <Hold label="Throttle −" onHold={() => setTouchInput({ throttle: -1 })} />
      <Hold label="Bank R" onHold={() => setTouchInput({ roll: 1 })} />
      <Hold label="Pitch ↑" onHold={() => setTouchInput({ pitch: 1 })} />
      <div />
      <Hold label="Pitch ↓" onHold={() => setTouchInput({ pitch: -1 })} />
    </div>
  );
}
