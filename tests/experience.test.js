import test from "node:test";
import assert from "node:assert/strict";
import { initialState, reducer } from "../src/experience/model.js";
import { locate, stages, storyLength } from "../src/story/storyData.js";
import {
  normalizeOrientation,
  gestureTravel,
  requestMotion,
} from "../src/interaction/motion.js";
test("tutorial requires discovery and four meaningful steps; timeout resets only intro", () => {
  let s = { ...initialState, experiencePhase: "TUTORIAL" };
  assert.equal(reducer(s, { type: "NAVIGATE", direction: 1 }), s);
  s = reducer(s, { type: "DISCOVER" });
  for (let i = 0; i < 3; i++) {
    s = reducer(s, { type: "NAVIGATE", direction: 1 });
  }
  assert.equal(s.introProgress, 3);
  assert.equal(reducer(s, { type: "INTRO_RESET" }).introProgress, 0);
  s = reducer(s, { type: "NAVIGATE", direction: 1 });
  assert.equal(s.currentStage, 1);
  assert.equal(s.storyIndex, 0);
  assert.equal(reducer(s, { type: "INTRO_RESET" }), s);
});
test("all 19 story segments are reachable in order and reversible", () => {
  let s = {
    ...initialState,
    experiencePhase: "STORY",
    storyIndex: 0,
    currentStage: 1,
  };
  const seen = [];
  for (let i = 0; i < storyLength; i++) {
    assert.deepEqual(
      { stage: s.currentStage, segment: s.currentSegment },
      locate(i),
    );
    seen.push(stages[s.currentStage].segments[s.currentSegment]);
    if (i < storyLength - 1) s = reducer(s, { type: "NAVIGATE", direction: 1 });
  }
  assert.equal(seen.length, 19);
  assert.equal(s.experiencePhase, "FINAL");
  assert.equal(s.musicActivated, true);
  s = reducer(s, { type: "MUSIC", value: "PLAYING" });
  assert.equal(s.experiencePhase, "MUSIC_MODE");
  for (let i = 0; i < storyLength + 3; i++) {
    s = reducer(s, { type: "NAVIGATE", direction: -1 });
  }
  assert.equal(s.storyIndex, 0);
  assert.equal(s.musicState, "PLAYING");
  assert.equal(s.musicActivated, true);
});
test("permission states select the right instruction mode", () => {
  for (const p of ["DENIED", "UNAVAILABLE", "ERROR"]) {
    assert.equal(
      reducer(initialState, { type: "PERMISSION", value: p }).interactionMode,
      "touch",
    );
  }
  assert.equal(
    reducer(initialState, { type: "PERMISSION", value: "GRANTED" })
      .interactionMode,
    "motion",
  );
});
test("sensor input is clamped, calibrated and rotated with screen", () => {
  assert.deepEqual(normalizeOrientation(0, 45, 45), { x: 0, y: 0 });
  assert.deepEqual(normalizeOrientation(300, -300), { x: 1, y: -1 });
  const landscape = normalizeOrientation(25, 0, 0, 90);
  assert.ok(Math.abs(landscape.x) < .0001);
  assert.equal(landscape.y, -1);
});
test("both iOS permission calls happen synchronously within initiating gesture", async () => {
  const calls = [];
  let resolve;
  global.window = {
    DeviceOrientationEvent: {
      requestPermission() {
        calls.push("orientation");
        return new Promise((r) => {
          resolve = r;
        });
      },
    },
    DeviceMotionEvent: {
      requestPermission() {
        calls.push("motion");
        return Promise.resolve("granted");
      },
    },
  };
  const permission = requestMotion();
  assert.deepEqual(calls, ["orientation", "motion"]);
  resolve("granted");
  assert.equal(await permission, "GRANTED");
  window.DeviceOrientationEvent.requestPermission = () =>
    Promise.resolve("denied");
  assert.equal(await requestMotion(), "DENIED");
  window.DeviceOrientationEvent.requestPermission = () => {
    throw new Error("denied by browser");
  };
  assert.equal(await requestMotion(), "ERROR");
});
test("copy keeps the flower as a single emoji and final exact wording", () => {
  const copy = stages.flatMap((s) => s.segments);
  assert.equal(copy.filter((s) => s.includes("🌸")).length, 1);
  assert.equal(
    copy.at(-1),
    "Doğum Günün Kutlu Olsun Elif Benim Küçççük Kuzenim iyiki varsın şimdi müziğin tadını çıkar.",
  );
});

await import("./scene-motion.test.js");

test("successive gestures retain committed travel in both directions", () => {
  let committed = 0;
  for (let i = 0; i < 8; i++) {
    const base = committed;
    assert.equal(gestureTravel(base, 40, 40, 390), committed);
    committed = gestureTravel(base, 40, 300, 390);
    assert.ok(committed > base);
    // The next finger lands somewhere else: zero delta still preserves world position.
    assert.equal(gestureTravel(committed, 320, 320, 390), committed);
  }
  for (let i = 0; i < 8; i++) committed = gestureTravel(committed, 300, 40, 390);
  assert.ok(Math.abs(committed) < 1e-10);
  assert.ok(Number.isFinite(gestureTravel(1, 30, 30, 0)));
});

test("diagonal travel accumulates two independent axes across new touches", () => {
  let x = 0, y = 0;
  for (const [dx, dy] of [[180, -140], [180, 140], [-180, 140], [-180, -140]]) {
    const beforeX = x, beforeY = y;
    assert.equal(gestureTravel(x, 80, 80, 390), x);
    assert.equal(gestureTravel(y, 400, 400, 844), y);
    x = gestureTravel(x, 80, 80 + dx, 390);
    y = gestureTravel(y, 400, 400 + dy, 844);
    assert.ok((x - beforeX) * dx > 0 && (y - beforeY) * dy > 0);
  }
  assert.ok(Math.abs(x) < 1e-10 && Math.abs(y) < 1e-10);
});
