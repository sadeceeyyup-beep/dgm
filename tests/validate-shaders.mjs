import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import * as shaders from "../src/shaders/materials.js";
const dir = await mkdtemp(join(tmpdir(), "elif-glsl-"));
const prefix = "#version 100\nprecision highp float;\n";
const vertexHeader =
  "attribute vec3 position,normal; attribute vec2 uv; uniform mat4 modelMatrix,modelViewMatrix,projectionMatrix; uniform mat3 normalMatrix;\n";
for (
  const name of Object.keys(shaders).filter((name) => name.endsWith("Fragment"))
) {
  const vertex = name === "starFragment" ? shaders.starVertex : shaders.vertex;
  const vert = join(dir, name + ".vert"), frag = join(dir, name + ".frag");
  await writeFile(vert, prefix + vertexHeader + vertex);
  await writeFile(
    frag,
    prefix + "uniform vec3 cameraPosition;\n" + shaders[name],
  );
  try {
    execFileSync("glslangValidator", ["-l", vert, frag], { stdio: "pipe" });
    console.log("PASS", name);
  } catch (e) {
    console.error(e.message, e.stdout?.toString(), e.stderr?.toString());
    process.exitCode = 1;
  }
}
