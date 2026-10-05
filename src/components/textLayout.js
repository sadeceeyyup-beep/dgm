// Stable opposite-side anchors inside the central reading band.
export function textPlanetOverlap(x, y, width, height, planet) {
  let hits = 0;
  const radius = planet.radius + 16;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const dx = x + (col + .5) * width / 6 - planet.x;
      const dy = y + (row + .5) * height / 6 - planet.y;
      if (dx * dx + dy * dy < radius * radius) hits++;
    }
  }
  return hits / 36;
}
export function chooseTextZone({ width, height, textWidth, textHeight, planet, top = 0, bottom = height, current, segment = 0 }) {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const left = Math.max(32, width * .085);
  const right = Math.max(left, width - Math.max(44, width * .1) - textWidth);
  const firstY = Math.max(top, height * .22);
  const lastY = Math.max(firstY, Math.min(bottom, height * .78) - textHeight);
  const side = (planet.column ?? (planet.x < width / 2 ? -1 : 1)) < 0 ? "right" : "left";
  const variation = segment % 4;
  const baseX = clamp(width * (side === "right" ? .62 : .38) - textWidth / 2, left, right);
  const inset = Math.min([0, 6, 2, 9][variation], (right - left) * .2);
  const x = clamp(baseX + (side === "right" ? -inset : inset), left, right);
  const middle = clamp(height * (.52 + [0, -.025, .02, -.01][variation]) - textHeight / 2, firstY, lastY);
  const shift = Math.min(84, height * .1);
  const score = (y) => textPlanetOverlap(x, y, textWidth, textHeight, planet) * 8
    + Math.abs(y - middle) / height * .28;
  let best = { x, y: middle, side, segment, score: score(middle) };
  for (const y of [clamp(middle - shift, firstY, lastY), clamp(middle + shift, firstY, lastY)]) {
    const value = score(y);
    if (value < best.score) best = { x, y, side, segment, score: value };
  }
  if (current && current.segment === segment && current.side === side && Math.abs(current.x - x) < 1
      && current.y >= firstY && current.y <= lastY && score(current.y) <= best.score + .04) return current;
  return best;
}
