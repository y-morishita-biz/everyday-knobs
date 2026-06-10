import * as Comlink from "comlink";
import initOpenCascade from "replicad-opencascadejs/src/replicad_single.js";
import opencascadeWasmUrl from "replicad-opencascadejs/src/replicad_single.wasm?url";
import { setOC } from "replicad";
import { buildKnob } from "../cad/knob";
import type { KnobParams } from "../cad/params";

/** Triangulated mesh + edge lines, ready to feed a Three.js BufferGeometry. */
export interface MeshPayload {
  vertices: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  edges: Float32Array;
}

export type ExportFormat = "stl" | "step";

let kernelReady: Promise<void> | null = null;

// Initialise the OpenCASCADE kernel exactly once, lazily on first use.
function ensureKernel(): Promise<void> {
  if (!kernelReady) {
    kernelReady = (async () => {
      const OC = await initOpenCascade({
        locateFile: () => opencascadeWasmUrl,
      });
      setOC(OC as Parameters<typeof setOC>[0]);
    })();
  }
  return kernelReady;
}

const api = {
  async build(params: KnobParams): Promise<MeshPayload> {
    await ensureKernel();
    const shape = buildKnob(params);
    const mesh = shape.mesh({ tolerance: 0.05, angularTolerance: 0.3 });
    const edges = shape.meshEdges();

    const payload: MeshPayload = {
      vertices: new Float32Array(mesh.vertices),
      indices: new Uint32Array(mesh.triangles),
      normals: new Float32Array(mesh.normals),
      edges: new Float32Array(edges.lines),
    };

    return Comlink.transfer(payload, [
      payload.vertices.buffer,
      payload.indices.buffer,
      payload.normals.buffer,
      payload.edges.buffer,
    ]);
  },

  async exportModel(params: KnobParams, format: ExportFormat): Promise<Blob> {
    await ensureKernel();
    const shape = buildKnob(params);
    return format === "stl" ? shape.blobSTL() : shape.blobSTEP();
  },
};

export type CadApi = typeof api;

Comlink.expose(api);
