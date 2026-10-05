import React, { Component, Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experience, input } from "../experience/store.js";
import { stages } from "../story/storyData.js";
import Starfield from "./Starfield.jsx";
import Portal from "./Portal.jsx";
import PlanetPassage from "./PlanetPassage.jsx";
import { segmentProgress, stageWarp } from "./sceneMotion.js";
import CelestialDetails from "./CelestialDetails.jsx";
class CanvasBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    experience.dispatch({ type: "QUALITY", value: "LOW" });
  }
  render() {
    return this.state.failed
      ? <div className="webgl-fallback" aria-label="Yıldızlı gökyüzü" />
      : this.props.children;
  }
}
function CameraRig({ stage, segment }) {
  const target = useRef(new THREE.Vector3());
  const transition = useRef({ planet: stage.planet, elapsed: 1.1 });
  useFrame(({ camera }, dt) => {
    const transitionState = transition.current;
    if (transitionState.planet !== stage.planet) {
      transitionState.planet = stage.planet;
      transitionState.elapsed = 0;
    }
    transitionState.elapsed = Math.min(1.1, transitionState.elapsed + Math.min(dt, .05));
    input.warpStrength = input.reduced ? 0 : stageWarp(transitionState.elapsed);
    input.lateralImpulse *= Math.exp(-Math.min(dt, .05) * 2.4);
    const progress = segmentProgress(segment, stage.segments.length);
    const pullback = progress * .30;
    input.scrollImpulse *= Math.exp(-Math.min(dt, .05) * 1.9);
    target.current.y = THREE.MathUtils.damp(
      target.current.y,
      progress * .075,
      2,
      dt,
    );
    target.current.x = THREE.MathUtils.damp(
      target.current.x,
      Math.sin(progress * Math.PI) * .045,
      2,
      dt,
    );
    const s = input.reduced ? .25 : 1;
    camera.position.x = THREE.MathUtils.damp(
      camera.position.x,
      stage.camera[0] + input.x * .10 * s + Math.sin(progress * Math.PI) * .055
        - (Math.tanh(input.persistentTravelX * .5) * .035 + input.lateralImpulse * .035) * s,
      1.8,
      dt,
    );
    camera.position.y = THREE.MathUtils.damp(
      camera.position.y,
      stage.camera[1] - input.y * .07 * s,
      1.8,
      dt,
    );
    camera.position.z = THREE.MathUtils.damp(
      camera.position.z,
      stage.camera[2] + pullback + input.scrollImpulse * .035 - input.warpStrength * .16,
      1.5,
      dt,
    );
    const fov = THREE.MathUtils.damp(camera.fov, 45 + input.warpStrength * .8, 8, dt);
    if (Math.abs(fov - camera.fov) > .001) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(target.current);
  });
  return null;
}
function PerformanceGuard() {
  const stats = useRef({ time: 0, frames: 0, slow: 0 });
  useFrame(({ gl, setDpr }, dt) => {
    if (document.hidden) return;
    const s = stats.current;
    s.time += dt;
    s.frames++;
    if (s.time > 4) {
      const fps = s.frames / s.time;
      if (fps < 42) {
        s.slow++;
        if (s.slow >= 2) {
          setDpr(1);
          experience.dispatch({ type: "QUALITY", value: "LOW" });
        }
      } else s.slow = 0;
      if (import.meta.env.DEV) {
        window.__cosmosMetrics = {
          fps: Math.round(fps * 10) / 10,
          drawCalls: gl.info.render.calls,
          triangles: gl.info.render.triangles,
          points: gl.info.render.points,
          dpr: gl.getPixelRatio(),
          quality: experience.get().quality,
        };
      }
      s.time = 0;
      s.frames = 0;
    }
  });
  return null;
}
function World({ state }) {
  const implosion =
      useRef({ current: 0, burst: 0, center: new THREE.Vector3(0, -1.2, 0) }).current,
    stage = stages[state.currentStage];
  const portal = ["BOOT", "INTRO_TEXT", "START_READY", "REQUEST_INPUT"]
    .includes(state.experiencePhase);
  return (
    <>
      <CameraRig stage={stage} segment={state.currentSegment} />
      <PerformanceGuard />
      <Starfield state={state} implosion={implosion} low={state.quality === "LOW"} />
      {portal && <Portal phase={state.experiencePhase} implosion={implosion} />}
      <ambientLight intensity={.28} />
      <directionalLight position={[-4, 5, 7]} intensity={2} />
      <PlanetPassage
        stageIndex={state.currentStage}
        segment={state.currentSegment}
      />
      {!portal && <CelestialDetails stage={stage} />}
    </>
  );
}
export default function Cosmos({ state, eventSource }) {
  const [active, setActive] = useState(!document.hidden);
  useEffect(() => {
    const cb = () => setActive(!document.hidden);
    document.addEventListener("visibilitychange", cb);
    return () => document.removeEventListener("visibilitychange", cb);
  }, []);
  return (
    <div className="cosmos" aria-hidden="true">
      <CanvasBoundary>
        <Canvas
          eventSource={eventSource}
          eventPrefix="client"
          frameloop={active ? "always" : "never"}
          dpr={[1, 1.4]}
          camera={{ position: [0, 0, 8], fov: 45, near: .1, far: 70 }}
          gl={{
            alpha: true,
            antialias: false,
            powerPreference: "high-performance",
          }}
          onCreated={({ gl, scene }) => {
            if (import.meta.env.DEV) window.__sceneGraph = scene;
            gl.domElement.addEventListener("webglcontextlost", (e) => {
              e.preventDefault();
              experience.dispatch({ type: "QUALITY", value: "LOW" });
            });
          }}
        >
          <Suspense fallback={null}>
            <World state={state} />
          </Suspense>
        </Canvas>
      </CanvasBoundary>
    </div>
  );
}
