import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { input } from "../experience/store.js";
import { useObjectInteraction } from "../interaction/useObjectInteraction.js";
import { diagnostics, measureObject } from "./diagnostics.js";
import { hazeFragment, vertex } from "../shaders/materials.js";
function Cluster({ id, position, constellation = false }) {
  const group = useRef(), dots = useRef(), line = useRef();
  const spring = useRef({ value: 0, velocity: 0, taps: 0 });
  const { size, camera } = useThree();
  const base = useMemo(() => {
    const coords = constellation
      ? [
        [-.65, .2],
        [-.39, .16],
        [-.13, .24],
        [.17, .05],
        [.38, .26],
        [.59, .16],
        [.35, -.11],
        [.17, .05],
      ]
      : Array.from(
        { length: 22 },
        (
          _,
          i,
        ) => [
          Math.sin(i * 2.4) * (.07 + Math.sqrt(i / 22) * .24),
          Math.cos(i * 2.4) * (.07 + Math.sqrt(i / 22) * .24),
        ],
      );
    return new Float32Array(
      coords.flatMap(([x, y], i) => [x, y, Math.sin(i * 1.8) * .06]),
    );
  }, [constellation]);
  const moving = useMemo(() => base.slice(), [base]);
  const tap = useObjectInteraction(() => {
    spring.current.velocity = 4;
    spring.current.taps++;
  });
  useEffect(() => () => {
    delete diagnostics.objects[id];
  }, [id]);
  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, .033), s = spring.current;
    s.velocity += (-s.value * 28 - s.velocity * 6) * dt;
    s.value += s.velocity * dt;
    group.current.position.x = position[0] + input.x * .17;
    group.current.position.y = position[1] - input.y * .13 +
      Math.sin(clock.elapsedTime * .3 + position[0]) * .025;
    for (let i = 0; i < base.length / 3; i++) {
      moving[i * 3] = base[i * 3] + Math.sin(i * 2.1) * s.value * .30;
      moving[i * 3 + 1] = base[i * 3 + 1] + Math.cos(i * 2.7) * s.value * .30;
    }
    dots.current.geometry.attributes.position.needsUpdate = true;
    if (line.current) {
      line.current.material.opacity = .19 *
        (1 - Math.min(1, Math.abs(s.value)));
      line.current.geometry.attributes.position.needsUpdate = true;
    }
    measureObject(id, group.current, camera, size, {
      taps: s.taps,
      pulse: s.value,
    });
  });
  return (
    <group ref={group} position={position} name={id}>
      <mesh {...tap}>
        <sphereGeometry args={[constellation ? .7 : .42, 12, 8]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          colorWrite={false}
        />
      </mesh>
      <points ref={dots} raycast={() => null}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[moving, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={constellation ? .029 : .025}
          color="#cfddff"
          transparent
          opacity={.84}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      {constellation && (
        <line ref={line} raycast={() => null}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[moving, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#789dce" transparent opacity={.19} />
        </line>
      )}
    </group>
  );
}
function Meteor({ stage }) {
  const root = useRef(), body = useRef();
  const pulse = useRef({ value: 0, taps: 0 });
  const tap = useObjectInteraction(() => {
    pulse.current.value = 1;
    pulse.current.taps++;
  });
  useFrame(({ clock, camera, size }, dt) => {
    const t = clock.elapsedTime, cycle = (t + 7) % 23;
    const persistent = stage.planet === "jupiter";
    root.current.visible = persistent || cycle < 1.6;
    pulse.current.value = THREE.MathUtils.damp(pulse.current.value, 0, 1.5, dt);
    root.current.position.set(
      persistent ? 1.08 + Math.sin(t * .19) * .1 : 3 - cycle * 4,
      persistent ? 2.25 + Math.sin(t * .15) * .08 : 3.8 - cycle * 1.3,
      -1.4,
    );
    root.current.position.x += pulse.current.value * .4;
    root.current.position.y += pulse.current.value * .25;
    body.current.rotation.y += dt * .2;
    body.current.rotation.z += dt * .12;
    measureObject("meteor", root.current, camera, size, {
      taps: pulse.current.taps,
      pulse: pulse.current.value,
      visible: root.current.visible,
    });
  });
  return (
    <group ref={root} name="meteor" {...tap}>
      <mesh>
        <sphereGeometry args={[.24, 8, 6]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          colorWrite={false}
        />
      </mesh>
      <mesh ref={body}>
        <icosahedronGeometry
          args={[stage.planet === "jupiter" ? .09 : .028, 1]}
        />
        <meshStandardMaterial color="#89858c" roughness={.9} />
      </mesh>
      {stage.planet !== "jupiter" && (
        <mesh position={[.3, .095, 0]} rotation={[0, 0, .32]}>
          <planeGeometry args={[.65, .006]} />
          <meshBasicMaterial
            color="#aac7f3"
            transparent
            opacity={.38}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
export default function CelestialDetails({ stage }) {
  const haze = useRef();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#5557a8") },
    }),
    [],
  );
  const target = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }, dt) => {
    uniforms.uTime.value = clock.elapsedTime;
    target.set(stage.planet === "sun" ? "#a35c2d" : stage.color);
    uniforms.uColor.value.lerp(target, 1 - Math.exp(-dt));
    haze.current.rotation.z = Math.sin(clock.elapsedTime * .017) * .12;
  });
  return (
    <>
      <mesh
        ref={haze}
        position={[-1.4, 1, -9]}
        rotation={[0, 0, -.6]}
        raycast={() => null}
      >
        <planeGeometry args={[16, 18]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={vertex}
          fragmentShader={hazeFragment}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {stage.planet === "saturn" && (
        <Cluster
          id="constellation"
          position={[.38, 2.18, -1.4]}
          constellation
        />
      )}
      <Meteor stage={stage} />
    </>
  );
}
