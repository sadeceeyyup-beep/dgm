// Read-only rendering measurements for browser checks; no controls or state shortcuts.
export const diagnostics = {
  planets: {},
  objects: {},
  portal: false,
  portalObjects: 0,
};
if (import.meta.env.DEV) window.__sceneDebug = diagnostics;
export function measureObject(id, object, camera, size, extra = {}) {
  if (!import.meta.env.DEV || !object) return;
  const point = object.position.clone();
  object.parent?.localToWorld(point);
  point.project(camera);
  diagnostics.objects[id] = {
    x: (point.x + 1) * size.width / 2,
    y: (1 - point.y) * size.height / 2,
    ...extra,
  };
}
