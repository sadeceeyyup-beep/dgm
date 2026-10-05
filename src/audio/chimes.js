let context;
let lastCue = 0;
export function unlockAudio() {
  try {
    context ||= new (window.AudioContext || window.webkitAudioContext)();
    return context.resume().catch(() => {});
  } catch {
    return Promise.resolve();
  }
}
function note(frequency, delay = 0, duration = .65) {
  if (!context || context.state !== "running") return;
  const start = context.currentTime + delay;
  const gain = context.createGain();
  const osc = context.createOscillator();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(.032, start + .012);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(start);
  osc.stop(start + duration + .03);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}
export function chime(kind = "progress", index = 0) {
  if (performance.now() - lastCue < 160) return;
  lastCue = performance.now();
  const notes = [523.25, 659.25, 783.99, 1046.5, 1174.66, 1318.51];
  if (kind === "start") {
    [0, 1, 2, 3].forEach((n, i) => note(notes[n], i * .095));
  } else if (kind === "complete") {
    note(notes[index % 6]);
    note(notes[(index + 2) % 6], .12);
  } else note(kind === "notification" ? 1318.51 : notes[Math.abs(index) % 6]);
}
