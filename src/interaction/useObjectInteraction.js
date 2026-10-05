import { useRef } from "react";
import { chime } from "../audio/chimes.js";
import { experience } from "../experience/store.js";
// R3F propagation is stopped at the nearest hit. A swipe is never a tap.
export function useObjectInteraction(onTap) {
  const start = useRef(null);
  const blocked = (e) =>
    e.nativeEvent?.target?.closest?.("button,a,iframe,.music-panel");
  return {
    onPointerDown(e) {
      if (blocked(e)) return;
      e.stopPropagation();
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    },
    onPointerUp(e) {
      if (blocked(e)) return;
      e.stopPropagation();
      const down = start.current;
      start.current = null;
      if (
        !down || down.id !== e.pointerId ||
        Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12
      ) return;
      onTap(e);
      if (!experience.get().discovered) {
        experience.dispatch({ type: "DISCOVER" });
      }
      chime("notification");
    },
    onPointerCancel() {
      start.current = null;
    },
  };
}
