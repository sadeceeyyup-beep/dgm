import React, { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { input, composition } from "../experience/store.js";
import { chooseTextZone, textPlanetOverlap } from "./textLayout.js";
import { segmentProgress } from "../scenes/sceneMotion.js";
import { stages } from "../story/storyData.js";
function snapshot(state) {
  return {
    stage: state.currentStage,
    segment: state.currentSegment,
    index: state.storyIndex,
    final: ["FINAL", "MUSIC_MODE"].includes(state.experiencePhase),
  };
}
export default function StoryText({ state }) {
  const root = useRef(), text = useRef();
  const anchors = useRef({ current: null, target: null });
  const [display, setDisplay] = useState(() => snapshot(state));
  const stage = stages[display.stage],
    message = stage.segments[display.segment];
  useLayoutEffect(() => {
    if (display.index === state.storyIndex) return;
    const t = gsap.to(text.current, {
      opacity: 0,
      y: -8,
      filter: input.reduced ? "blur(0px)" : "blur(2px)",
      duration: input.reduced ? .12 : .18,
      ease: "power2.in",
      onComplete: () => setDisplay(snapshot(state)),
    });
    return () => t.kill();
  }, [state.storyIndex, display.index]);
  useLayoutEffect(() => {
    const from = input.reduced ? { opacity: 0 } : { x: 0, y: 12, scale: 1, filter: "blur(2px)" };
    const ctx = gsap.context(() => {
      gsap.fromTo(text.current, { ...from, opacity: 0 }, {
        x: 0,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        opacity: 1,
        duration: input.reduced ? .2 : .55,
        ease: "power3.out",
      });
    }, root);
    return () => ctx.revert();
  }, [display.index]);
  useLayoutEffect(() => {
    const el = root.current;
    let tween, overlapSamples = 0, lastChange = 0;
    let column = composition.columns[stage.planet] ?? 1;
    const retarget = (delay = 0, collision = false) => {
      const width = innerWidth, height = innerHeight;
      const paragraph = el.querySelector("p");
      paragraph?.style.removeProperty("font-size");
      if (paragraph && el.offsetHeight > height * .56) {
        const font = parseFloat(getComputedStyle(paragraph).fontSize);
        paragraph.style.fontSize = `${Math.max(width > height ? 18 : 23, font * (height * .56 - 32) / (el.offsetHeight - 32))}px`;
      }
      const textWidth = el.offsetWidth, textHeight = el.offsetHeight;
      const measured = composition.planet;
      const planet = {
        x: column < 0 ? 0 : width,
        y: height * (1.05 - segmentProgress(display.segment, stage.segments.length) * 1.1),
        radius: measured.name === stage.planet ? measured.radius : width * .28,
        column,
      };
      if (collision && measured.name === stage.planet) {
        planet.x = measured.x;
        planet.y = measured.y;
      }
      const next = display.final ? {
        x: (width - textWidth) / 2,
        y: Math.max(height * .34, Math.min(height * .575 - textHeight / 2, height * .76 - textHeight)),
        side: "center",
      } : chooseTextZone({ width, height, textWidth, textHeight, planet, current: anchors.current.target, segment: display.index });
      const previous = anchors.current.target;
      if (previous && previous.side === next.side && Math.abs(next.x - previous.x) < 1 && Math.abs(next.y - previous.y) < 1) return;
      tween?.kill();
      anchors.current.target = next;
      lastChange = performance.now();
      if (!anchors.current.current) {
        el.dataset.anchor = next.side;
        gsap.set(el, { left: next.x, top: next.y });
        anchors.current.current = next;
      } else {
        const realign = !display.final && el.dataset.anchor !== next.side;
        if (!realign) el.dataset.anchor = next.side;
        tween = gsap.timeline({ delay, onComplete: () => { anchors.current.current = next; } })
          .to(el, { opacity: realign ? 0 : .72, scale: .985, duration: input.reduced ? .08 : .16 }, 0)
          .set(el, { attr: { "data-anchor": next.side } }, input.reduced ? .08 : .16)
          .to(el, { left: next.x, top: next.y, duration: input.reduced ? .2 : .7, ease: "power3.inOut" }, 0)
          .to(el, { opacity: 1, scale: 1, duration: .22 }, input.reduced ? .1 : .48);
      }
    };
    retarget();
    const observer = new ResizeObserver(() => retarget());
    observer.observe(el);
    // Only a column change or sustained serious overlap may change an anchor.
    const timer = setInterval(() => {
      if (display.final) return;
      const nextColumn = composition.columns[stage.planet] ?? 1;
      if (nextColumn !== column) {
        column = nextColumn;
        overlapSamples = 0;
        retarget(.1);
        return;
      }
      const target = anchors.current.target, planet = composition.planet;
      if (!target || planet.name !== stage.planet || performance.now() - lastChange < 1500) return;
      const overlap = textPlanetOverlap(target.x, target.y, el.offsetWidth, el.offsetHeight, planet);
      overlapSamples = overlap > .2 ? overlapSamples + 1 : 0;
      if (overlapSamples >= 2) { overlapSamples = 0; retarget(0, true); }
    }, 100);
    const resize = () => retarget();
    window.addEventListener("resize", resize);
    return () => {
      clearInterval(timer); observer.disconnect(); window.removeEventListener("resize", resize);
      tween?.kill(); gsap.set(el, { opacity: 1, scale: 1 });
    };
  }, [display.index, display.final]);
  return (
    <article
      ref={root}
      className={`story-content soft-story ${display.final ? "final-text" : ""} ${
        message.length > 180 ? "long-copy" : ""
      }`}
    >
      <div
        ref={text}
        className="story-message"
        aria-live="polite"
        aria-atomic="true"
      >
        {display.final
          ? (
            <h1>
              Doğum Günün Kutlu Olsun <em>Elif</em>
              <span>
                Benim Küçççük Kuzenim iyiki varsın şimdi müziğin tadını çıkar.
              </span>
            </h1>
          )
          : <p>{message}</p>}
      </div>
      {!display.final && (
        <div className="segment-dots" aria-hidden="true">
          {stage.segments.map((_, i) => (
            <span className={i === display.segment ? "selected" : ""} key={i} />
          ))}
        </div>
      )}
    </article>
  );
}
