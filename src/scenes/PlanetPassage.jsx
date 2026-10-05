import React, { useLayoutEffect, useRef, useState } from "react";
import Planet from "./Planet.jsx";
import { stages } from "../story/storyData.js";
export default function PlanetPassage({ stageIndex, segment }) {
  const previous = useRef(stageIndex);
  const [layers, setLayers] = useState(() =>
    stageIndex > 0 ? [{ index: stageIndex, direction: 1, exiting: false }] : []
  );
  useLayoutEffect(() => {
    if (stageIndex === previous.current) return;
    const direction = stageIndex > previous.current ? 1 : -1;
    previous.current = stageIndex;
    setLayers((current) => [
      ...current.filter((layer) => !layer.exiting).map((layer) => ({
        ...layer,
        exiting: true,
        direction,
      })),
      ...(stageIndex > 0
        ? [{ index: stageIndex, direction, exiting: false }]
        : []),
    ]);
    const timer = setTimeout(
      () => setLayers((current) => current.filter((layer) => !layer.exiting)),
      1250,
    );
    return () => clearTimeout(timer);
  }, [stageIndex]);
  return layers.map((layer) => (
    <Planet
      key={layer.index}
      stage={stages[layer.index]}
      segment={layer.exiting ? undefined : segment}
      exiting={layer.exiting}
      direction={layer.direction}
    />
  ));
}
