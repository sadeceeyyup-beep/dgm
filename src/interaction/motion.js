export const clamp = (n, min = -1, max = 1) => Math.max(min, Math.min(max, n));
export function normalizeOrientation(gamma, beta, baseline = 0, angle = 0) {
  const x = clamp(gamma / 25), y = clamp((beta - baseline) / 25);
  const a = angle * Math.PI / 180;
  return {
    x: clamp(x * Math.cos(a) + y * Math.sin(a)),
    y: clamp(y * Math.cos(a) - x * Math.sin(a)),
  };
}
export async function requestMotion() {
  // Invoke both permission functions before the first await, preserving the gesture.
  const O = window.DeviceOrientationEvent, M = window.DeviceMotionEvent;
  try {
    const requests = [O, M].filter((C) =>
      typeof C?.requestPermission === "function"
    ).map((C) => C.requestPermission());
    if (requests.length) {
      const results = await Promise.all(requests);
      return results.every((r) => r === "granted") ? "GRANTED" : "DENIED";
    }
    // On browsers without an iOS permission API, confirm a real sensor signal.
    if (!O || !window.isSecureContext) return "UNAVAILABLE";
    return await new Promise((resolve) => {
      let timer;
      const sample = (event) => {
        if (!Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) {
          return;
        }
        clearTimeout(timer);
        window.removeEventListener("deviceorientation", sample);
        resolve("GRANTED");
      };
      window.addEventListener("deviceorientation", sample);
      timer = setTimeout(() => {
        window.removeEventListener("deviceorientation", sample);
        resolve("UNAVAILABLE");
      }, 500);
    });
  } catch {
    return "ERROR";
  }
}

// One viewport-wide drag = one travel unit. A new gesture only captures this base.
export function gestureTravel(base, startX, currentX, width) {
  return base + (currentX - startX) / Math.max(1, width);
}
