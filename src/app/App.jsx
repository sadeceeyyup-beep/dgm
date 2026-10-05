import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { experience, input, useExperience } from "../experience/store.js";
import { requestMotion } from "../interaction/motion.js";
import { useInteraction } from "../interaction/useInteraction.js";
import { chime, unlockAudio } from "../audio/chimes.js";
import Cosmos from "../scenes/Cosmos.jsx";
import ProgressRail from "../components/ProgressRail.jsx";
import GestureHint from "../components/GestureHint.jsx";
import StoryText from "../components/StoryText.jsx";
import MusicPlayer from "../audio/MusicPlayer.jsx";
import { stages } from "../story/storyData.js";
export default function App() {
  const state = useExperience(),
    root = useRef(),
    intro = useRef(),
    tutorial = useRef();
  const [hintVisible, setHintVisible] = useState(true);
  const [motionOffer, setMotionOffer] = useState(false);
  const [requestingMotion, setRequestingMotion] = useState(false);
  const transitionTimer = useRef();
  useEffect(() => () => clearTimeout(transitionTimer.current), []);
  useInteraction(root, state.interactionMode, state.experiencePhase);
  useEffect(() => {
    const a = setTimeout(
      () => experience.dispatch({ type: "PHASE", value: "INTRO_TEXT" }),
      900,
    );
    const b = setTimeout(
      () => experience.dispatch({ type: "PHASE", value: "START_READY" }),
      3300,
    );
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);
  const introStarted = state.experiencePhase !== "BOOT";
  useEffect(() => {
    if (!intro.current || !introStarted) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".intro-title", { opacity: 0, y: 12, filter: "blur(7px)" }, {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: input.reduced ? .4 : 2,
        ease: "power3.out",
      });
    }, intro);
    return () => ctx.revert();
  }, [introStarted]);
  useEffect(() => {
    if (state.experiencePhase !== "TUTORIAL") return;
    setHintVisible(true);
    chime("notification");
    const ctx = gsap.context(
      () =>
        gsap.fromTo(".tutorial-title span", {
          opacity: 0,
          y: 15,
          filter: "blur(8px)",
          letterSpacing: ".06em",
        }, {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          letterSpacing: "-.03em",
          duration: input.reduced ? .3 : 1.3,
          stagger: input.reduced ? 0 : .17,
          ease: "power3.out",
        }),
      tutorial,
    );
    const t = setTimeout(() => setHintVisible(false), 9500);
    return () => {
      ctx.revert();
      clearTimeout(t);
    };
  }, [state.experiencePhase]);
  useEffect(() => {
    if (state.experiencePhase !== "TUTORIAL") return;
    let frame, x = 0, y = 0, last = performance.now();
    const update = (now) => {
      const d = 1 - Math.exp(-4 * Math.min((now - last) / 1000, .1));
      last = now;
      x += (input.x - x) * d;
      y += (input.y - y) * d;
      tutorial.current?.style.setProperty("--tx", `${x * 2}px`);
      tutorial.current?.style.setProperty("--ty", `${y * 1.5}px`);
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [state.experiencePhase]);
  useEffect(() => {
    if (state.experiencePhase !== "TUTORIAL" || !window.isSecureContext) return;
    const needsGesture = [window.DeviceOrientationEvent, window.DeviceMotionEvent]
      .some((C) => typeof C?.requestPermission === "function");
    if (needsGesture) {
      setMotionOffer(true);
      return;
    }
    let cancelled = false;
    requestMotion().then((result) => {
      if (!cancelled) experience.dispatch({ type: "PERMISSION", value: result });
    });
    return () => { cancelled = true; };
  }, [state.experiencePhase === "TUTORIAL"]);
  async function enableMotion() {
    if (requestingMotion) return;
    setRequestingMotion(true);
    const result = await requestMotion();
    experience.dispatch({ type: "PERMISSION", value: result });
    setMotionOffer(false);
    setRequestingMotion(false);
    setHintVisible(true);
  }
  function start() {
    if (experience.get().experiencePhase !== "START_READY") return;
    unlockAudio().then(() => chime("start"));
    experience.dispatch({ type: "PHASE", value: "REQUEST_INPUT" });
    transitionTimer.current = setTimeout(() => {
      experience.dispatch({ type: "PHASE", value: "TUTORIAL" });
    }, input.reduced ? 1000 : 2150);
  }
  const phase = state.experiencePhase,
    opening = ["BOOT", "INTRO_TEXT", "START_READY", "REQUEST_INPUT"].includes(
      phase,
    );
  const story = ["STORY", "FINAL", "MUSIC_MODE"].includes(phase);
  const final = ["FINAL", "MUSIC_MODE"].includes(phase);
  return (
    <main
      ref={root}
      className={`experience phase-${phase.toLowerCase()} ${
        state.musicActivated ? "with-music" : ""
      }`}
      style={{ "--accent": stages[state.currentStage].color }}
      data-phase={phase}
      data-mode={state.interactionMode}
      data-stage={state.currentStage}
      data-segment={state.currentSegment}
    >
      <div className="nebula" />
      <Cosmos state={state} eventSource={root} />
      <div className="vignette" />
      {opening && (
        <section
          ref={intro}
          className={`intro ${phase === "REQUEST_INPUT" ? "imploding" : ""}`}
          aria-label="Başlangıç"
        >
          <div className={`intro-copy ${phase === "BOOT" ? "pre-intro" : ""}`}>
            <h1 className="intro-title">
              Sen Doğmadan<br /><em>Önce</em>
            </h1>
          </div>
          {["START_READY", "REQUEST_INPUT"].includes(phase) && (
            <button
              className="portal-start"
              onClick={start}
              disabled={phase === "REQUEST_INPUT"}
              aria-label="Başla"
            >
              <span>BAŞLA</span>
            </button>
          )}
        </section>
      )}
      {phase === "TUTORIAL" && (
        <section ref={tutorial} className="tutorial">
          {(hintVisible || motionOffer || !state.discovered) && (
            <div className="tutorial-notice">
              <GestureHint motion={state.interactionMode === "motion"} />
              <span>
                {state.interactionMode === "motion"
                  ? "Telefonunu hafifçe hareket ettir ✨"
                  : "Parmağını ekranda gezdir ✨"}
              </span>
              {motionOffer && (
                <button className="motion-enable" onClick={enableMotion} disabled={requestingMotion}>
                  {requestingMotion ? "İzin bekleniyor…" : "Hareketi etkinleştir"}
                </button>
              )}
            </div>
          )}
          <div className="tutorial-heading">
            <h1 className="tutorial-title">
              <span>Merhabalar</span>
              <span>
                <em>Hanım Efendi</em>
              </span>
            </h1>
          </div>
          <div className="tutorial-discovery">
            {state.discovered
              ? (
                <>
                  <GestureHint scroll />
                  <p>Aşağı kaydır</p>
                </>
              )
              : null}
          </div>
        </section>
      )}
      {story && <StoryText state={state} />}
      {story && <ProgressRail state={state} />}
      {story && !final && (
        <footer className="story-footer">
          <span className="planet-label">
            <i />
            {stages[state.currentStage].name}
          </span>
          <span className="navigation-note">Yukarı / aşağı kaydır</span>
        </footer>
      )}
      <MusicPlayer state={state} />
      <div className="landscape-note">Dikey kullanmanı öneririm.</div>
    </main>
  );
}
