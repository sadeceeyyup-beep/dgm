import React, { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { starFragment, starVertex } from "../shaders/materials.js";
import { input } from "../experience/store.js";
import { stages } from "../story/storyData.js";
import { starStoryTravel } from "./sceneMotion.js";
function Layer({ count, depth, size, color, implosion, state }) {
  const group = useRef(), material = useRef();
  const travel = useRef(0), horizontal = useRef(input.persistentTravelX), drift = useRef(0);
  const vertical = useRef(input.persistentTravelY);
  const { size: screen } = useThree();
  const aspect = screen.width / screen.height;
  const opening = ["BOOT", "INTRO_TEXT", "START_READY", "REQUEST_INPUT"].includes(state.experiencePhase);
  const distance = starStoryTravel(state.currentStage, state.currentSegment,
    stages[state.currentStage].segments.length, state.introProgress);
  const regionColor = useMemo(() => new THREE.Color(color).lerp(
    new THREE.Color(stages[state.currentStage].color), state.currentStage === 0 ? 0 : .16),
  [color, state.currentStage]);
  const data = useMemo(() => {
    let seed = depth * 239 + count;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const p = new Float32Array(count * 3),
      s = new Float32Array(count),
      a = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const z = -depth - rand() * 6;
      p[i * 3] = (rand() - .5) * 1.4;
      p[i * 3 + 1] = (rand() - .5) * 1.4;
      p[i * 3 + 2] = z;
      s[i] = size * (.5 + rand());
      a[i] = rand();
    }
    return { p, s, a };
  }, [count, depth, size, aspect]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTravel: { value: 0 },
      uTravelX: { value: input.persistentTravelX },
      uTravelY: { value: input.persistentTravelY },
      uDrift: { value: 0 },
      uJourney: { value: 0 },
      uDepth: { value: depth },
      uAspect: { value: aspect },
      uWarp: { value: 0 },
      uBurst: { value: 0 },
      uReveal: { value: .025 },
      uDpr: { value: 1.3 },
      uImplode: { value: 0 },
      uCenter: { value: implosion.center },
      uColor: { value: new THREE.Color(color) },
    }),
    [color, depth],
  );
  useFrame(({ gl }, dt) => {
    dt = Math.min(dt, .05);
    const u = material.current.uniforms;
    u.uAspect.value = aspect;
    travel.current = THREE.MathUtils.damp(travel.current, distance, 2.6, dt);
    horizontal.current = THREE.MathUtils.damp(horizontal.current, input.persistentTravelX, 5, dt);
    vertical.current = THREE.MathUtils.damp(vertical.current, input.persistentTravelY, 5, dt);
    if (!opening) drift.current += dt * (input.reduced ? .008 : .09);
    const motion = input.reduced ? .12 : 1;
    u.uTravel.value = travel.current * motion;
    u.uTravelX.value = horizontal.current * motion;
    u.uTravelY.value = vertical.current * motion;
    u.uDrift.value = drift.current * motion;
    u.uJourney.value = opening ? 0 : 1;
    u.uTime.value += dt * (input.reduced ? .15 : 1);
    u.uWarp.value = input.warpStrength;
    u.uColor.value.lerp(regionColor, 1 - Math.exp(-dt * 1.5));
    u.uBurst.value = implosion.burst;
    u.uReveal.value = THREE.MathUtils.damp(u.uReveal.value,
      opening ? .025 + implosion.current * .24 + implosion.burst * .9 : 1, 2, dt);
    material.current.uniforms.uDpr.value = gl.getPixelRatio();
    material.current.uniforms.uImplode.value = implosion.current;
    const intensity = (input.reduced ? .22 : 1) *
      (opening || state.interactionMode === "motion" ? 1 : .25);
    group.current.position.x = THREE.MathUtils.damp(
      group.current.position.x,
      input.x * 1.15 / (depth * .21 + 1) * intensity,
      3,
      dt,
    );
    group.current.position.y = THREE.MathUtils.damp(
      group.current.position.y,
      -input.y * .72 / (depth * .21 + 1) * intensity,
      3,
      dt,
    );
    group.current.rotation.z = u.uTime.value * .0008;
  });
  return (
    <group ref={group} name={`star-layer-${depth}`}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.p, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[data.s, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[data.a, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={starVertex}
          fragmentShader={starFragment}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
export default function Starfield({ implosion, low, state }) {
  return (
    <>
      <Layer
        count={low ? 650 : 1400}
        depth={10}
        size={1.9}
        color="#91a4cf"
        implosion={implosion}
        state={state}
      />
      <Layer
        count={low ? 260 : 550}
        depth={3}
        size={2}
        color="#c4d9ff"
        implosion={implosion}
        state={state}
      />
      <Layer
        count={low ? 40 : 80}
        depth={0}
        size={2.2}
        color="#e4eaff"
        implosion={implosion}
        state={state}
      />
    </>
  );
}
