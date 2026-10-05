import React from "react";
import { stages } from "../story/storyData.js";
export default function ProgressRail({ state }) {
  const final = ["FINAL", "MUSIC_MODE"].includes(state.experiencePhase);
  const stage = state.currentStage;
  const progress = stage === 0
    ? state.introProgress / 4
    : (state.currentSegment + 1) / stages[stage].segments.length;
  const total = (stage + progress) / 6;
  return (
    <aside
      className={`progress-rail ${stage > 0 ? "quiet" : ""} ${
        final ? "complete" : ""
      }`}
      aria-label="Uzay yolculuğu ilerlemesi"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(total * 100)}
      aria-valuetext={`${stages[stage].name}, ${
        stage === 0 ? state.introProgress : state.currentSegment + 1
      } / ${stage === 0 ? 4 : stages[stage].segments.length}`}
    >
      <div className="rail-track">
        <div className="rail-fill" style={{ height: `${total * 100}%` }} />
      </div>
      {stages.map((s, i) => (
        <span
          key={s.planet}
          className={`rail-node ${s.planet} ${i === stage ? "active" : ""} ${
            i < stage ? "visited" : ""
          }`}
          title={s.name}
          style={{ "--orb": s.color }}
        />
      ))}
      {final && <span className="rail-stream" />}
    </aside>
  );
}
