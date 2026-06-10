import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Replicad uses opencascade.js (a large emscripten/WASM module). We exclude it
// from dependency pre-bundling so esbuild does not try to transform the WASM
// glue, and run workers as ES modules so the worker can `import` replicad.
export default defineConfig({
  base: "./",
  plugins: [react()],
  optimizeDeps: {
    exclude: ["replicad", "replicad-opencascadejs"],
  },
  worker: {
    format: "es",
  },
});
