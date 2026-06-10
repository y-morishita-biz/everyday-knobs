/// <reference types="vite/client" />

// opencascade.js build shipped by replicad-opencascadejs is an emscripten module
// (a factory returning a Promise of the OpenCASCADE instance). It has no bundled
// types, so we declare a minimal shape here.
declare module "replicad-opencascadejs/src/replicad_single.js" {
  export interface OpenCascadeModuleOptions {
    locateFile?: (path: string) => string;
  }
  const initOpenCascade: (options?: OpenCascadeModuleOptions) => Promise<unknown>;
  export default initOpenCascade;
}
