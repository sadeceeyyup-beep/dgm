// Segment count is supplied by storyData; no planet has a hard-coded step count.
export function segmentProgress(segment, count) {
  return count <= 1 ? 0 : Math.max(0, Math.min(1, segment / (count - 1)));
}
export function planetPose(progress, width, height, side, radius) {
  const p = Math.max(0, Math.min(1, progress));
  const edgeArc = Math.sin(p * Math.PI);
  return {
    x: side * (width * .30 + edgeArc * (radius * .52 + width * .10)),
    y: (-.55 + progress * 1.10) * height,
    z: -.35 - edgeArc * .55,
  };
}
export function angularVelocity(idle, scrollMomentum, response = 0) {
  return idle + Math.abs(scrollMomentum) * .23 + Math.max(0, response) * .18;
}

// Each planet owns one continuous region; real segment counts span its length.
export function starStoryTravel(stageIndex, segment, count, introProgress = 0) {
  return stageIndex === 0 ? introProgress * 1.2
    : 4.8 + (stageIndex - 1) * 6 + segmentProgress(segment, count) * 4.8;
}
export function stageWarp(elapsed) {
  if (elapsed <= 0 || elapsed >= 1.05) return 0;
  return  .4 * Math.sin(Math.PI * elapsed / 1.05) ** 2;
}
