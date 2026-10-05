import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import {
  atmosphereFragment,
  cloudFragment,
  coronaFragment,
  planetFragment,
  ringFragment,
  vertex,
} from "../shaders/materials.js";
import { input, composition } from "../experience/store.js";
import { useObjectInteraction } from "../interaction/useObjectInteraction.js";
import { angularVelocity, planetPose, segmentProgress } from "./sceneMotion.js";
import { diagnostics, measureObject } from "./diagnostics.js";
const types = { neptune: 0, saturn: 1, jupiter: 2, earth: 3, sun: 4 };
export default function Planet({ stage, segment, exiting, direction }) {
  const group = useRef(),
    surface = useRef(),
    rings = useRef(),
    clouds = useRef(),
    moon = useRef();
  const { viewport } = useThree();
  const type = types[stage.planet],
    sun = type === 4,
    side = type % 2 === 0 ? 1 : -1;
  const radius = sun ? 1.37 : type === 1 ? .96 : 1.12;
  const journey = useRef({ value: direction > 0 ? -.22 : 1.22 });
  const lateral = useRef({ x: 0, y: 0,
    column: composition.columns[stage.planet] ?? side,
    target: composition.columns[stage.planet] ?? side, tween: null });
  const screenPoint = useMemo(() => new THREE.Vector3(), []);
  const finalHero = sun && !exiting && segment === stage.segments.length - 1;
  const hero = useRef({ value: 0 });
  const heroPoint = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    const tween = gsap.to(hero.current, { value: finalHero ? 1 : 0,
      duration: input.reduced ? .3 : 1.25, ease: "power3.inOut" });
    return () => tween.kill();
  }, [finalHero]);
  const response = useRef({ pulse: 0, taps: 0 });
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uType: { value: type },
    uPulse: { value: 0 },
    uOpacity: { value: 1 },
    uRadius: { value: radius },
    uCenter: { value: new THREE.Vector3() },
    uRingNormal: { value: new THREE.Vector3(0, 0, 1) },
  }), [type, radius]);
  const atmosphere = useMemo(
    () => ({
      uColor: { value: new THREE.Color(stage.color) },
      uPulse: { value: 0 },
      uOpacity: uniforms.uOpacity,
    }),
    [stage.color, uniforms],
  );
  const corona = useMemo(
    () => ({
      uTime: uniforms.uTime,
      uPulse: uniforms.uPulse,
      uOpacity: uniforms.uOpacity,
    }),
    [uniforms],
  );
  const ringUniforms = useMemo(
    () => ({
      ...corona,
      uPulse: { value: 0 },
      uRadius: uniforms.uRadius,
      uLight: { value: new THREE.Vector3() },
    }),
    [corona, uniforms],
  );
  const light = useMemo(() => new THREE.Vector3(-.8, .7, 1.2).normalize(), []);
  const inverseRing = useMemo(() => new THREE.Quaternion(), []);
  const tap = useObjectInteraction(() => {
    if (!exiting) {
      response.current.pulse = 1;
      response.current.taps++;
    }
  });
  useEffect(() => {
    const target = exiting
      ? (direction > 0 ? 1.38 : -.38)
      : segmentProgress(segment, stage.segments.length);
    const t = gsap.to(journey.current, {
      value: target,
      duration: input.reduced ? .5 : 1.2,
      ease: "power2.inOut",
    });
    const fade = gsap.to(uniforms.uOpacity, {
      value: exiting ? 0 : 1,
      duration: exiting ? .7 : .6,
      delay: exiting ? .35 : 0,
    });
    return () => {
      t.kill();
      fade.kill();
    };
  }, [segment, exiting, direction, stage.segments.length, uniforms]);
  useEffect(() => () => {
    lateral.current.tween?.kill();
    delete diagnostics.planets[stage.planet];
    delete diagnostics.objects[stage.planet];
  }, [stage.planet]);
  useFrame(({ clock, camera, size }, rawDt) => {
    const dt = Math.min(rawDt, .05),
      t = clock.elapsedTime,
      motion = input.reduced ? .3 : 1;
    const column = composition.columns[stage.planet] ?? side;
    if (!exiting && lateral.current.target !== column) {
      lateral.current.target = column;
      lateral.current.tween?.kill();
      lateral.current.tween = gsap.to(lateral.current, {
        column, duration: input.reduced ? .25 : .85, ease: "power2.inOut",
      });
    }
    const pose = planetPose(
      journey.current.value,
      viewport.width,
      viewport.height,
      lateral.current.column,
      radius,
    );
    lateral.current.x = THREE.MathUtils.damp(lateral.current.x, input.x * .2, 3.2, dt);
    lateral.current.y = THREE.MathUtils.damp(lateral.current.y, input.y, 2.8, dt);
    group.current.position.set(
      pose.x + lateral.current.x * .18 * motion + Math.sin(t * .16 + type) * .025,
      pose.y - lateral.current.y * .075 * motion + Math.sin(t * .21) * .023,
      pose.z - (1 - Math.abs(lateral.current.column)) * .45 + lateral.current.x * side * .065 * motion,
    );
    if (sun && hero.current.value > 0) {
      const depth = 8.5;
      const halfHeight = Math.tan(camera.fov * Math.PI / 360) * depth;
      const worldWidth = halfHeight * 2 * size.width / size.height;
      const heroRadius = Math.min(worldWidth * .64, depth * .65);
      // Tangent to the lower limb at 25% screen height, in camera space.
      const slope = halfHeight * .5 / depth;
      heroPoint.set(0, depth * slope + heroRadius * Math.sqrt(1 + slope * slope), -depth)
        .applyMatrix4(camera.matrixWorld);
      group.current.position.lerp(heroPoint, hero.current.value);
      group.current.scale.setScalar(THREE.MathUtils.lerp(1, heroRadius / radius, hero.current.value));
    } else group.current.scale.setScalar(1);
    if (!exiting) {
      screenPoint.copy(group.current.position).applyMatrix4(camera.matrixWorldInverse);
      const depth = Math.max(.1, -screenPoint.z);
      screenPoint.applyMatrix4(camera.projectionMatrix);
      const screen = composition.planet;
      screen.name = stage.planet;
      screen.x = (screenPoint.x + 1) * size.width / 2;
      screen.y = (1 - screenPoint.y) * size.height / 2;
      screen.radius = radius * group.current.scale.x * (type === 1 ? 1.75 : 1.04) * size.height /
        (2 * Math.tan(camera.fov * Math.PI / 360) * depth);
      screen.column = column;
    }
    response.current.pulse = THREE.MathUtils.damp(
      response.current.pulse,
      0,
      type === 1 ? 1.8 : 2.2,
      dt,
    );
    const pulse = response.current.pulse;
    const speed = angularVelocity(
      sun ? .018 : .035,
      input.scrollImpulse,
      type === 2 ? pulse : 0,
    ) * motion;
    surface.current.rotation.y += dt * speed;
    uniforms.uTime.value = t * motion;
    uniforms.uPulse.value = type === 1 ? 0 : pulse;
    uniforms.uCenter.value.copy(group.current.position);
    atmosphere.uPulse.value = type === 0 || type === 3 ? pulse : 0;
    if (rings.current) {
      rings.current.rotation.set(
        1.13 + Math.sin((1 - pulse) * Math.PI * 2) * pulse * .035,
        .18,
        -.28 + pulse * .045,
      );
      uniforms.uRingNormal.value.set(0, 0, 1).applyEuler(
        rings.current.rotation,
      );
      inverseRing.copy(rings.current.quaternion).invert();
      ringUniforms.uLight.value.copy(light).applyQuaternion(inverseRing);
      ringUniforms.uPulse.value = pulse;
    }
    if (clouds.current) {
      clouds.current.rotation.y += dt * (speed * 1.13 + .006 * motion);
    }
    if (moon.current) {
      const a = t * .07;
      moon.current.position.set(
        Math.cos(a) * 1.5,
        Math.sin(a) * .28,
        Math.sin(a) * 1.5,
      );
      moon.current.rotation.y += dt * .04;
    }
    if (import.meta.env.DEV) {
      diagnostics.planets[stage.planet] = {
        y: group.current.position.y,
        x: group.current.position.x,
        z: group.current.position.z,
        rotation: surface.current.rotation.y,
        speed,
        momentum: input.scrollImpulse,
        progress: journey.current.value,
        column: lateral.current.column,
        targetColumn: lateral.current.target,
        pulse,
        taps: response.current.taps,
        exiting,
      };
      measureObject(stage.planet, group.current, camera, size, {
        taps: response.current.taps,
        pulse,
      });
    }
  });
  return (
    <group ref={group} name={`planet-${stage.planet}`}>
      {sun && (
        <mesh position={[0, 0, -.06]}>
          <planeGeometry args={[radius * 3.5, radius * 3.5]} />
          <shaderMaterial
            uniforms={corona}
            vertexShader={vertex}
            fragmentShader={coronaFragment}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
      <mesh
        ref={surface}
        {...tap}
        rotation={[.08, .3, type === 2 ? -.12 : .12]}
        renderOrder={1}
      >
        <sphereGeometry args={[radius, 64, 40]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={vertex}
          fragmentShader={planetFragment}
          transparent
        />
      </mesh>
      {!sun && (
        <mesh scale={1.025} renderOrder={3} raycast={() => null}>
          <sphereGeometry args={[radius, 48, 32]} />
          <shaderMaterial
            uniforms={atmosphere}
            vertexShader={vertex}
            fragmentShader={atmosphereFragment}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
      {type === 1 && (
        <mesh ref={rings} {...tap} renderOrder={2} rotation={[1.13, .18, -.28]}>
          <ringGeometry args={[radius * 1.28, radius * 2.14, 128, 2]} />
          <shaderMaterial
            uniforms={ringUniforms}
            vertexShader={vertex}
            fragmentShader={ringFragment}
            side={THREE.DoubleSide}
            transparent
            depthWrite={false}
          />
        </mesh>
      )}
      {type === 3 && (
        <>
          <mesh ref={clouds} scale={1.009} raycast={() => null} renderOrder={2}>
            <sphereGeometry args={[radius, 48, 32]} />
            <shaderMaterial
              uniforms={corona}
              vertexShader={vertex}
              fragmentShader={cloudFragment}
              transparent
              depthWrite={false}
            />
          </mesh>
          <mesh ref={moon} {...tap}>
            <sphereGeometry args={[.105, 16, 12]} />
            <meshStandardMaterial color="#8b8a82" roughness={1} />
          </mesh>
        </>
      )}
    </group>
  );
}
