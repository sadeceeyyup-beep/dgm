import { useSyncExternalStore } from "react";
import { initialState, reducer } from "./model.js";
let state = initialState;
const listeners = new Set();
export const experience = {
  get: () => state,
  dispatch: (action) => {
    const next = reducer(state, action);
    if (next !== state) {
      state = next;
      listeners.forEach((fn) => fn());
    }
  },
  subscribe: (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
export function useExperience() {
  return useSyncExternalStore(experience.subscribe, experience.get);
}
// Frame-rate input lives outside React: no render on every sensor or pointer event.
export const input = {
  x: 0, y: 0, scrollImpulse: 0, reduced: false,
  // World travel outlives individual gestures, phase effects and local parallax.
  persistentTravelX: 0, persistentTravelY: 0, lateralImpulse: 0, warpStrength: 0,
};

// Composition is independent of story/navigation state; columns survive segments.
export const composition = {
  columns: { neptune: 1, saturn: -1, jupiter: 1, earth: -1, sun: 1 },
  planet: { name: "", x: 0, y: 0, radius: 0, column: 1 },
};
