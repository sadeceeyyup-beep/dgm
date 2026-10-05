import { defineConfig } from "vite";
import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

export default defineConfig({
  base: "/dgm/",
  plugins: [{
    name: "birthday-static-route",
    apply: "build",
    async writeBundle({ dir }) {
      const routeDir = resolve(dir, "iyiki-dogdun-kiymetli-insan");
      await mkdir(routeDir, { recursive: true });
      await copyFile(resolve(dir, "index.html"), resolve(routeDir, "index.html"));
    },
  }],
  oxc: { jsx: { runtime: "automatic" } },
  build: { target: "es2022" },
});
