import { locate, storyLength } from "../story/storyData.js";
export const initialState = {
  experiencePhase: "BOOT",
  interactionMode: "touch",
  motionPermission: "UNAVAILABLE",
  currentStage: 0,
  currentSegment: 0,
  storyIndex: -1,
  introProgress: 0,
  discovered: false,
  musicState: "IDLE",
  musicActivated: false,
  musicPlayed: false,
  muted: false,
  quality: "BALANCED",
};
export function reducer(state, action) {
  switch (action.type) {
    case "PHASE":
      return { ...state, experiencePhase: action.value };
    case "PERMISSION":
      return {
        ...state,
        motionPermission: action.value,
        interactionMode: action.value === "GRANTED" ? "motion" : "touch",
      };
    case "DISCOVER":
      return state.discovered ? state : { ...state, discovered: true };
    case "INTRO_RESET":
      return state.experiencePhase === "TUTORIAL"
        ? { ...state, introProgress: 0 }
        : state;
    case "NAVIGATE": {
      if (state.experiencePhase === "TUTORIAL") {
        if (!state.discovered) return state;
        const p = Math.max(0, state.introProgress + action.direction);
        if (p < 4) return { ...state, introProgress: p };
        return {
          ...state,
          experiencePhase: "STORY",
          introProgress: 4,
          storyIndex: 0,
          currentStage: 1,
          currentSegment: 0,
        };
      }
      if (!["STORY", "FINAL", "MUSIC_MODE"].includes(state.experiencePhase)) {
        return state;
      }
      const index = Math.max(
        0,
        Math.min(storyLength - 1, state.storyIndex + action.direction),
      );
      const { stage, segment } = locate(index);
      const final = index === storyLength - 1;
      return {
        ...state,
        storyIndex: index,
        currentStage: stage,
        currentSegment: segment,
        experiencePhase: final
          ? (state.musicPlayed ? "MUSIC_MODE" : "FINAL")
          : "STORY",
        musicActivated: state.musicActivated || final,
      };
    }
    case "MUSIC":
      return {
        ...state,
        musicState: action.value,
        musicPlayed: state.musicPlayed || action.value === "PLAYING",
        experiencePhase:
          action.value === "PLAYING" && state.storyIndex === storyLength - 1
            ? "MUSIC_MODE"
            : state.experiencePhase,
      };
    case "MUTE":
      return { ...state, muted: action.value };
    case "QUALITY":
      return { ...state, quality: action.value };
    default:
      return state;
  }
}
