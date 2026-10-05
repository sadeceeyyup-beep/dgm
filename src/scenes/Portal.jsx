import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { portalFragment, vertex } from "../shaders/materials.js";
import { input } from "../experience/store.js";
import { diagnostics } from "./diagnostics.js";
export default function Portal({ phase, implosion }) {
  const group = useRef();
  const { size, viewport } = useThree();
  const landscape = size.width > size.height && size.height <= 550;
  const opacity = useMemo(() => ({ value: 0 }), []);
  const layers = useMemo(
    () =>
      [0, 1, 2].map((i) => ({
        uTime: { value: 0 },
        uOpacity: opacity,
        uLayer: { value: i },
      })),
    [opacity],
  );
  useEffect(() => {
    diagnostics.portal = true;
    diagnostics.portalObjects = 3;
    return () => {
      diagnostics.portal = false;
      diagnostics.portalObjects = 0;
      implosion.current = 0;
      implosion.burst = 0;
    };
  }, [implosion]);
  useEffect(() => {
    if (phase === "START_READY") {
      const reveal = gsap.timeline()
        .fromTo(group.current.scale, { x: .84, y: .84, z: .84 },
          { x: 1, y: 1, z: 1, duration: input.reduced ? .4 : 2.2, ease: "sine.out" })
        .to(opacity, { value: 1, duration: input.reduced ? .4 : 1.9, ease: "sine.inOut" }, 0);
      return () => reveal.kill();
    }
    if (phase !== "REQUEST_INPUT") return;
    const duration = input.reduced ? .3 : .8;
    const timeline = gsap.timeline({
      onComplete: () => {
        if (group.current) group.current.visible = false;
        diagnostics.portal = false;
      },
    });
    timeline.to(group.current.scale, {
      x: .015,
      y: .015,
      z: .015,
      duration,
      ease: "power3.in",
    })
      .to(implosion, { current: 1, duration, ease: "power2.in" }, 0)
      .to(opacity, { value: 1.35, duration: duration * .7 }, 0)
      .to(opacity, { value: 0, duration: .18 }, duration - .1)
      .to(
        implosion,
        { current: 0, duration: input.reduced ? .4 : 1.1, ease: "expo.out" },
        duration + .06,
      )
      .to(implosion, { burst: input.reduced ? .15 : 1, duration: .18, ease: "power2.out" }, duration)
      .to(implosion, { burst: 0, duration: input.reduced ? .3 : 1.1, ease: "sine.out" }, duration + .18);
    return () => timeline.kill();
  }, [phase, implosion, opacity]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * (input.reduced ? .25 : 1);
    layers.forEach((u) => {
      u.uTime.value = t;
    });
    const x = landscape ? viewport.width * .23 : 0,
      y = landscape ? -viewport.height * .01 : -viewport.height * .19;
    group.current.position.set(x, y + Math.sin(t * .8) * .022, 0);
    implosion.center.set(x, y, 0);
    group.current.rotation.z = Math.sin(t * .09) * .04;
  });
  return (
    <group ref={group} name="start-portal">
      {layers.map((uniforms, i) => (
        <mesh
          key={i}
          position={[0, 0, (i - 1) * .1]}
          rotation={[i * .08, -i * .06, i * .7]}
          scale={1 + i * .045}
        >
          <planeGeometry args={[2.9, 2.9]} />
          <shaderMaterial
            uniforms={uniforms}
            vertexShader={vertex}
            fragmentShader={portalFragment}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}
