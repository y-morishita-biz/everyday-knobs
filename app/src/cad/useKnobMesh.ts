import { useCallback, useEffect, useRef, useState } from "react";
import { cad } from "./cadClient";
import type { KnobParams } from "./params";
import type { MeshPayload } from "../worker/cad.worker";

export type BuildPhase = "idle" | "preview" | "refining";

/** Delay before the full (textured, fine) build kicks in after params settle. */
const REFINE_DELAY_MS = 350;

interface Job {
  params: KnobParams;
  draft: boolean;
}

/**
 * Drive the CAD worker with a coalescing, two-phase scheduler.
 *
 * - **Coalescing**: only ever one build runs at a time; while it runs, new
 *   parameter changes overwrite a single pending slot, so a fast drag can never
 *   pile up a queue of stale (and expensive) builds.
 * - **Two-phase**: when a heavy side texture is active, interaction shows an
 *   instant smooth *draft* (texture skipped, coarse mesh); the full textured
 *   build runs only once movement stops. This keeps dragging responsive even
 *   when the final knurl takes several seconds.
 */
export function useKnobMesh(params: KnobParams) {
  const [mesh, setMesh] = useState<MeshPayload | null>(null);
  const [busy, setBusy] = useState(true);
  const [phase, setPhase] = useState<BuildPhase>("preview");
  const [buildError, setBuildError] = useState<string | null>(null);

  const running = useRef(false);
  const latest = useRef<Job | null>(null);
  const builtKey = useRef("");
  const fullPending = useRef(false);
  const refineTimer = useRef<number | undefined>(undefined);

  const settle = useCallback(() => {
    if (fullPending.current) {
      setBusy(true);
      setPhase("refining");
    } else {
      setBusy(false);
      setPhase("idle");
    }
  }, []);

  const pump = useCallback(
    async function pump() {
      if (running.current) return;
      const job = latest.current;
      if (!job) {
        settle();
        return;
      }
      const key = (job.draft ? "d:" : "f:") + JSON.stringify(job.params);
      if (key === builtKey.current) {
        latest.current = null;
        settle();
        return;
      }
      running.current = true;
      latest.current = null;
      setBusy(true);
      setPhase(job.draft ? "preview" : "refining");
      try {
        const payload = await cad.build(job.params, job.draft);
        setMesh(payload);
        setBuildError(null);
        builtKey.current = key;
      } catch (err) {
        setBuildError(err instanceof Error ? err.message : "生成に失敗しました");
      } finally {
        if (!job.draft) fullPending.current = false;
        running.current = false;
        if (latest.current) {
          void pump();
        } else {
          settle();
        }
      }
    },
    [settle],
  );

  useEffect(() => {
    const heavy = params.surfaceTexture !== "none";
    fullPending.current = heavy;
    latest.current = { params, draft: heavy };
    void pump();

    window.clearTimeout(refineTimer.current);
    if (heavy) {
      refineTimer.current = window.setTimeout(() => {
        latest.current = { params, draft: false };
        void pump();
      }, REFINE_DELAY_MS);
    }
    return () => window.clearTimeout(refineTimer.current);
  }, [params, pump]);

  return { mesh, busy, phase, buildError, setBuildError };
}
