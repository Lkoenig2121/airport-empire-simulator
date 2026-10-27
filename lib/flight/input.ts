import { emptyFlightInput, type FlightInput } from "./types";

const held = {
  KeyW: false,
  KeyS: false,
  KeyA: false,
  KeyD: false,
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};

const touch = emptyFlightInput();

export function setTouchInput(partial: Partial<FlightInput>) {
  Object.assign(touch, partial);
}

export function resetTouchInput() {
  Object.assign(touch, emptyFlightInput());
}

export function readFlightInput(): FlightInput {
  return {
    throttle: (held.KeyW ? 1 : 0) + (held.KeyS ? -1 : 0) + touch.throttle,
    yaw: (held.KeyD ? 1 : 0) + (held.KeyA ? -1 : 0) + touch.yaw,
    pitch: (held.ArrowUp ? 1 : 0) + (held.ArrowDown ? -1 : 0) + touch.pitch,
    roll: (held.ArrowRight ? 1 : 0) + (held.ArrowLeft ? -1 : 0) + touch.roll,
  };
}

export function bindFlightKeys() {
  const down = (event: KeyboardEvent) => {
    if (event.code in held) {
      held[event.code as keyof typeof held] = true;
      event.preventDefault();
    }
  };
  const up = (event: KeyboardEvent) => {
    if (event.code in held) {
      held[event.code as keyof typeof held] = false;
      event.preventDefault();
    }
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    (Object.keys(held) as (keyof typeof held)[]).forEach((k) => {
      held[k] = false;
    });
    resetTouchInput();
  };
}
