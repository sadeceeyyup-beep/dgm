import React from "react";
export const VIDEO_ID = "YP7ghF9pwys";
export default function MusicPlayer({ state }) {
  if (!["FINAL", "MUSIC_MODE"].includes(state.experiencePhase)) return null;
  return (
    <div className="music-panel">
      <a
        className="music-start"
        href="https://www.youtube.com/watch?v=YP7ghF9pwys&list=RDYP7ghF9pwys&index=1&t=70s"
        target="_blank"
        rel="noopener noreferrer"
      >
        Müziğin tadını çıkar
      </a>
    </div>
  );
}
