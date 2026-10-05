import test from "node:test";
import assert from "node:assert/strict";
import {
  angularVelocity,
  planetPose,
  segmentProgress,
  starStoryTravel,
  stageWarp,
} from "../src/scenes/sceneMotion.js";
import { stages } from "../src/story/storyData.js";
test("each real segment count spans the full upward passage in both directions", () => {
  for (const stage of stages.slice(1)) {
    const poses = stage.segments.map((_, i) =>
      planetPose(segmentProgress(i, stage.segments.length), 3.06, 6.62, 1, 1.12)
    );
    assert.ok(poses[0].y < 0);
    assert.ok(poses.at(-1).y > 0);
    for (let i = 1; i < poses.length; i++) {
      assert.ok(poses[i].y > poses[i - 1].y);
    }
    assert.equal(
      segmentProgress(stage.segments.length - 1, stage.segments.length),
      1,
    );
    assert.ok(planetPose(1.38, 3.06, 6.62, 1, 1.12).y > poses.at(-1).y);
  }
});
test("scroll boosts rotation in either direction and decays to positive idle speed", () => {
  const idle = .035;
  assert.ok(angularVelocity(idle, 1) > angularVelocity(idle, 0));
  assert.ok(angularVelocity(idle, -1) > idle);
  let momentum = 1, previous = Infinity;
  for (let frame = 0; frame < 600; frame++) {
    momentum *= Math.exp(-1.9 / 60);
    const speed = angularVelocity(idle, momentum);
    assert.ok(speed > 0);
    assert.ok(speed <= previous);
    previous = speed;
  }
  assert.ok(Math.abs(previous - idle) < 1e-6);
});
test("degenerate single segment remains finite; orbit clears the central reading area", () => {
  assert.equal(segmentProgress(0, 1), 0);
  const bottom = planetPose(0, 3.06, 6.62, 1, 1.12),
    middle = planetPose(.5, 3.06, 6.62, 1, 1.12);
  assert.ok(middle.x > bottom.x);
  assert.ok(Number.isFinite(middle.y));
});

test("star regions advance through each real segment count and remain reversible", () => {
  let previousEnd = -Infinity;
  for (let index = 1; index < stages.length; index++) {
    const count = stages[index].segments.length;
    const positions = stages[index].segments.map((_, segment) => starStoryTravel(index, segment, count));
    assert.ok(positions[0] > previousEnd);
    assert.ok(Math.abs(positions.at(-1) - positions[0] - 4.8) < 1e-10);
    for (let i = 1; i < count; i++) assert.ok(positions[i] > positions[i - 1]);
    assert.deepEqual([...positions].reverse(), Array.from({ length: count }, (_, i) => starStoryTravel(index, count - 1 - i, count)));
    previousEnd = positions.at(-1);
  }
});
test("warp rises from rest, peaks once and settles within 1.05 seconds at 40% strength", () => {
  assert.equal(stageWarp(0), 0);
  assert.ok(Math.abs(stageWarp(.525) - .4) < 1e-10);
  assert.equal(stageWarp(1.05), 0);
  assert.equal(stageWarp(4), 0);
  for (let t = .05; t < .45; t += .05) assert.ok(stageWarp(t) > stageWarp(t - .05));
});

const { chooseTextZone, textPlanetOverlap } = await import("../src/components/textLayout.js");
test("wide text chooses the opposite safe zone without leaving iPhone viewport", () => {
  for (const x of [-20, 410]) {
    for (const y of [110, 422, 740]) {
      const planet = { x, y, radius: 120 };
      const bounds = { width: 390, height: 844, textWidth: 286, textHeight: 245, planet, top: 90, bottom: 750 };
      const zone = chooseTextZone(bounds);
      assert.ok(zone.x >= 24 && zone.x + 286 <= 346);
      assert.ok(zone.y >= 90 && zone.y + 245 <= 750);
      assert.equal(zone.side, x < 195 ? "right" : "left");
      assert.ok(textPlanetOverlap(zone.x, zone.y, 286, 245, planet) < .09);
      assert.deepEqual(chooseTextZone({ ...bounds, current: zone }), zone);
    }
  }
});
test("planet columns cross the full composition without altering story row", () => {
  for (const progress of [0, .5, 1]) {
    const left = planetPose(progress, 3.06, 6.62, -1, 1.12);
    const right = planetPose(progress, 3.06, 6.62, 1, 1.12);
    const center = planetPose(progress, 3.06, 6.62, 0, 1.12);
    assert.equal(left.y, right.y);
    assert.equal(center.y, right.y);
    assert.ok(right.x - left.x > 1.8);
    assert.equal(center.x, 0);
  }
});
