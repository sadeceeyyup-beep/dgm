import { useEffect } from "react";
import { experience, input, composition } from "../experience/store.js";
import { clamp, normalizeOrientation, gestureTravel } from "./motion.js";
import { stages } from "../story/storyData.js";
import { chime } from "../audio/chimes.js";
export function useInteraction(root, mode, phase) {
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      input.reduced = media.matches;
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (mode !== "motion") return;
    let baseline = null,
      previousAcceleration = 0;
    function orientation(e) {
      if (!Number.isFinite(e.gamma) || !Number.isFinite(e.beta)) return;
      baseline ??= e.beta;
      const value = normalizeOrientation(
        e.gamma,
        e.beta,
        baseline,
        screen.orientation?.angle || 0,
      );
      input.x = value.x;
      input.y = value.y;
      if (Math.abs(value.x) + Math.abs(value.y) > .25) {
        experience.dispatch({ type: "DISCOVER" });
      }
    }
    function motion(e) {
      const a = e.acceleration;
      if (!a || a.x == null) return;
      const total = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
      if (total > 9 && previousAcceleration < 9) {
        if (!experience.get().discovered) {
          experience.dispatch({ type: "DISCOVER" });
        }
        chime("notification");
      }
      previousAcceleration = total;
    }
    window.addEventListener("deviceorientation", orientation);
    window.addEventListener("devicemotion", motion);
    const fallback = setTimeout(() => {
      if (baseline === null) {
        experience.dispatch({ type: "PERMISSION", value: "UNAVAILABLE" });
      }
    }, 4000);
    return () => {
      clearTimeout(fallback);
      window.removeEventListener("deviceorientation", orientation);
      window.removeEventListener("devicemotion", motion);
    };
  }, [mode]);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let start = null, lockUntil = 0, wheelSum = 0, wheelReset, introReset;
    const navigate = (direction) => {
      if (performance.now() < lockUntil) return;
      const before = experience.get();
      experience.dispatch({ type: "NAVIGATE", direction });
      const after = experience.get();
      if (after !== before) {
        lockUntil = performance.now() + 780;
        input.scrollImpulse = clamp(
          input.scrollImpulse + direction * .9,
          -2,
          2,
        );
        chime(
          after.currentStage !== before.currentStage ? "complete" : "progress",
          after.storyIndex < 0 ? after.introProgress : after.storyIndex,
        );
      }
      clearTimeout(introReset);
      if (after.experiencePhase === "TUTORIAL") {
        introReset = setTimeout(
          () => experience.dispatch({ type: "INTRO_RESET" }),
          28000,
        );
      }
    };
    const interactive = (target) =>
      !!target.closest("button, iframe, a, .music-panel");
    const down = (e) => {
      if (interactive(e.target) || start || e.isPrimary === false) return;
      start = {
        x: e.clientX,
        y: e.clientY,
        t: performance.now(),
        id: e.pointerId,
        lastY: e.clientY,
        baseTravelX: input.persistentTravelX,
        baseTravelY: input.persistentTravelY,
        width: innerWidth,
        height: innerHeight,
        travel: ["TUTORIAL", "STORY", "FINAL", "MUSIC_MODE"].includes(phase),
      };
      el.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      if (start && e.pointerId !== start.id) return;
      if (
        start &&
        Math.abs(e.clientY - start.y) > Math.abs(e.clientX - start.x) * 1.45
      ) {
        input.scrollImpulse = clamp(
          input.scrollImpulse + (start.lastY - e.clientY) / 180,
          -2,
          2,
        );
        start.lastY = e.clientY;
      }
      if (start?.travel && e.pointerId === start.id) {
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        const next = gestureTravel(start.baseTravelX, start.x, e.clientX, start.width);
        input.lateralImpulse = clamp(input.lateralImpulse + (next - input.persistentTravelX) * 3);
        input.persistentTravelX = next;
        input.persistentTravelY = gestureTravel(start.baseTravelY, start.y, e.clientY, start.height);
        if (Math.hypot(dx, dy) > 14) experience.dispatch({ type: "DISCOVER" });
      }
      // Absolute pointer position is only a small hover/sensor parallax, never travel.
      if (mode === "touch" && !start && e.pointerType === "mouse") {
        input.x = clamp((e.clientX / innerWidth - .5) * 2);
        input.y = clamp((e.clientY / innerHeight - .5) * 2);
      }
    };
    const up = (e) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (
        Math.abs(dy) > 62 && Math.abs(dy) > Math.abs(dx) * 1.45 &&
        performance.now() - start.t < 1600
      ) navigate(dy < 0 ? 1 : -1);
      else if (start.travel && Math.abs(dx) > 62 && Math.abs(dx) > Math.abs(dy) * 1.45) {
        const planet = stages[experience.get().currentStage].planet;
        if (planet in composition.columns) composition.columns[planet] = dx < 0 ? 1 : -1;
      }

      // Every move is already committed; release must not reset world travel.
      start = null;
    };
    const cancel = () => {
      start = null;
    };
    const wheel = (e) => {
      if (interactive(e.target)) return;
      e.preventDefault();
      input.scrollImpulse = clamp(input.scrollImpulse + e.deltaY / 350, -2, 2);
      wheelSum += e.deltaY;
      clearTimeout(wheelReset);
      wheelReset = setTimeout(() => {
        wheelSum = 0;
      }, 160);
      if (Math.abs(wheelSum) > 65) {
        navigate(Math.sign(wheelSum));
        wheelSum = 0;
      }
    };
    const key = (e) => {
      if (interactive(e.target)) return;
      if (["ArrowDown", "PageDown", "ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        navigate(["ArrowDown", "PageDown"].includes(e.key) ? 1 : -1);
      }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
    el.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", key);
    return () => {
      clearTimeout(wheelReset);
      clearTimeout(introReset);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", cancel);
      el.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", key);
    };
  }, [root, mode, phase]);
}
