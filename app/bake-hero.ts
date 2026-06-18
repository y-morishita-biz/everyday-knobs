// One-off baker: renders selected presets to lightweight JSON meshes for the
// landing-page hero (so the LP can show a real, randomized knob without loading
// the CAD/WASM engine). Bundle with esbuild, then run with node:
//
//   node_modules/.bin/esbuild bake-hero.ts --bundle --platform=node \
//     --format=esm --outfile=bake-hero.mjs
//   node bake-hero.mjs
//
// Output: site/assets/hero/<id>.json  ({ positions, normals, indices })

import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
// @ts-expect-error — emscripten glue ships without types
import initOpenCascade from "replicad-opencascadejs/src/replicad_single.js";
import { setOC } from "replicad";
import { buildKnob } from "./src/cad/knob";
import { PRESETS } from "./src/cad/presets";

// Curated, visually distinct knobs that read well in the auto-rotating hero.
const HERO_IDS = [
  "basic",
  "fluted",
  "hex",
  "dome",
  "barrel",
  "lobed",
  "scallop",
  "fullring",
  "diamond",
];

declare const __dirname: string;
const wasmPath = join(
  __dirname,
  "node_modules/replicad-opencascadejs/src/replicad_single.wasm",
);
const outDir = join(__dirname, "../site/assets/hero");

async function main() {
  const OC = await initOpenCascade({ locateFile: () => wasmPath });
  setOC(OC as Parameters<typeof setOC>[0]);
  mkdirSync(outDir, { recursive: true });

  for (const id of HERO_IDS) {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) {
      console.warn(`skip: no preset "${id}"`);
      continue;
    }
    const shape = buildKnob(preset.params);
    const mesh = shape.mesh({ tolerance: 0.05, angularTolerance: 0.3 });
    const json = JSON.stringify({
      positions: Array.from(mesh.vertices, (v) => round(v)),
      normals: Array.from(mesh.normals, (v) => round(v)),
      indices: Array.from(mesh.triangles),
    });
    const file = join(outDir, `${id}.json`);
    writeFileSync(file, json);
    console.log(`baked ${id}: ${(json.length / 1024).toFixed(0)} KB, ${mesh.triangles.length / 3} tris`);
  }
}

// Trim float noise to keep the JSON small without visible quality loss.
function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
