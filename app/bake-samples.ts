// Baker for the exhibition sample set: every knob in src/cad/samples.ts, built
// and written out as binary STL. Run from the `app/` directory:
//
//   node_modules/.bin/esbuild bake-samples.ts --bundle --platform=node \
//     --format=esm --outfile=/tmp/bake-samples.mjs \
//     --banner:js="import{fileURLToPath}from'node:url';import{dirname}from'node:path';const __filename=fileURLToPath(import.meta.url);const __dirname=dirname(__filename);"
//   node /tmp/bake-samples.mjs
//
// The banner is required: the bundled emscripten glue reads `__dirname`, which
// does not exist in an ESM bundle. (We pass `locateFile` ourselves, so the value
// only has to be defined, not correct.)
//
// Output: samples/<shaft>/<id>.stl  +  samples/README.md (index for the table)

import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
// @ts-expect-error — emscripten glue ships without types
import initOpenCascade from "replicad-opencascadejs/src/replicad_single.js";
import { setOC } from "replicad";
import { buildKnob } from "./src/cad/knob";
import { SHAFTS, type KnobParams, type ShaftType } from "./src/cad/params";
import {
  FAMILY_NOTE,
  SAMPLES,
  SHAFT_ORDER,
  sampleParams,
  type KnobSample,
} from "./src/cad/samples";

// Fine enough that flutes and tick marks stay crisp on a print, while binary STL
// keeps the files small enough to live in the repo.
const STL_OPTS = { tolerance: 0.03, angularTolerance: 0.2, binary: true };

// Paths are resolved against the working directory: run this from `app/`.
const appDir = process.cwd();
const wasmPath = join(
  appDir,
  "node_modules/replicad-opencascadejs/src/replicad_single.wasm",
);
const outRoot = join(appDir, "../samples");

async function main() {
  const OC = await initOpenCascade({ locateFile: () => wasmPath });
  setOC(OC as Parameters<typeof setOC>[0]);

  let total = 0;
  let count = 0;
  for (const shaft of SHAFT_ORDER) {
    const dir = join(outRoot, shaft);
    mkdirSync(dir, { recursive: true });
    console.log(`\n── ${shaft} — ${SHAFTS[shaft].label}`);

    for (const sample of SAMPLES[shaft]) {
      const params = sampleParams(sample, shaft);
      reportClamps(sample, shaft, params);

      const blob = buildKnob(params).blobSTL(STL_OPTS);
      const bytes = Buffer.from(await blob.arrayBuffer());
      writeFileSync(join(dir, `${sample.id}.stl`), bytes);
      console.log(
        `   ${sample.id.padEnd(18)} ${(bytes.length / 1024).toFixed(0).padStart(5)} KB  ${sample.name}`,
      );
      total += bytes.length;
      count += 1;
    }
  }

  writeFileSync(join(outRoot, "README.md"), buildIndex());
  console.log(`\n${count} STL / ${(total / 1024 / 1024).toFixed(1)} MB → samples/`);
}

/**
 * Surface any value clampParams had to pull back. The catalogue is meant to sit
 * inside every limit already, so a hit here means a sample needs retuning rather
 * than silently shipping a shape that isn't what was authored.
 */
function reportClamps(sample: KnobSample, shaft: ShaftType, params: KnobParams) {
  for (const [key, authored] of Object.entries(sample.shape)) {
    const got = params[key as keyof KnobParams];
    if (typeof authored === "number" && typeof got === "number") {
      if (Math.abs(authored - got) > 1e-6) {
        console.warn(`   ! ${sample.id}/${shaft}: ${key} ${authored} → ${got} (clamped)`);
      }
    } else if (authored !== got) {
      console.warn(`   ! ${sample.id}/${shaft}: ${key} ${authored} → ${got} (clamped)`);
    }
  }
}

/** Index so the printed set can be identified on the exhibition table. */
function buildIndex(): string {
  const lines = [
    "# 展示用サンプル STL",
    "",
    "`app/src/cad/samples.ts` の30形状を書き出したもの。**軸3種 × 各10形状で、",
    "30個すべて別の形**。軸ごとに性格を変えてあるので、トレイ3枚が3つの製品ラインに見える。",
    "",
    "このディレクトリは `.gitignore` 済み（8MB超）。再生成は `app/` で以下",
    "（`--banner:js` は必須。理由は [`app/bake-samples.ts`](../app/bake-samples.ts) 冒頭）：",
    "",
    "```bash",
    "node_modules/.bin/esbuild bake-samples.ts --bundle --platform=node --format=esm --outfile=/tmp/bake-samples.mjs --banner:js=\"import{createRequire}from'node:module';import{fileURLToPath}from'node:url';import{dirname}from'node:path';const require=createRequire(import.meta.url);const __filename=fileURLToPath(import.meta.url);const __dirname=dirname(__filename);\" && node /tmp/bake-samples.mjs",
    "```",
    "",
  ];

  for (const shaft of SHAFT_ORDER) {
    const spec = SHAFTS[shaft];
    const depth = sampleParams(SAMPLES[shaft][0], shaft).shaftHoleDepth;
    lines.push(
      `## \`${shaft}/\` — ${FAMILY_NOTE[shaft]}`,
      "",
      `- エンコーダ：${spec.label}`,
      `- 軸穴：${spec.socket.kind} / 深さ ${depth}mm / 軸出代 ${spec.shaftProtrusion}mm`,
      "",
      "| # | 形状 | 特徴 | 外径 × 高さ |",
      "|---|---|---|---|",
    );
    for (const s of SAMPLES[shaft]) {
      const p = sampleParams(s, shaft);
      const dia =
        p.skirt === "flange"
          ? `φ${p.skirtDiameter}(裾)`
          : p.bodyDiameter === p.topDiameter
            ? `φ${p.bodyDiameter}`
            : `φ${p.bodyDiameter}→φ${p.topDiameter}`;
      lines.push(
        `| ${s.id.slice(0, 2)} | ${s.name} | ${s.note} | ${dia} × H${p.bodyHeight} |`,
      );
    }
    lines.push("");
  }

  lines.push(
    "寸法の正は [`reference/README.md`](../reference/README.md)。",
    "はめあいクリアランスは既定値（片側 0.15mm）。実機に合わせる場合はアプリの",
    "フィットテスト片で詰めてから再生成する。",
    "",
  );
  return lines.join("\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
