import * as Comlink from "comlink";
import type { CadApi } from "../worker/cad.worker";

// Spin up the CAD worker once and expose a typed, promise-based API.
// All kernel work happens off the UI thread.
const worker = new Worker(new URL("../worker/cad.worker.ts", import.meta.url), {
  type: "module",
});

export const cad = Comlink.wrap<CadApi>(worker);
