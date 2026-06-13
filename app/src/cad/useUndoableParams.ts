import { useCallback, useRef, useState } from "react";
import type { KnobParams } from "./params";

/** Commit window: rapid edits (slider drags) within this gap collapse into one undo step. */
const COMMIT_MS = 450;

const same = (a: KnobParams, b: KnobParams) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Param state with undo/redo. Continuous edits (a slider drag) are coalesced
 * into a single history entry once they settle; discrete actions (preset,
 * random, paste) commit immediately via `replace`.
 */
export function useUndoableParams(initial: KnobParams) {
  const [present, setPresent] = useState<KnobParams>(initial);
  const past = useRef<KnobParams[]>([]);
  const future = useRef<KnobParams[]>([]);
  const committed = useRef<KnobParams>(initial); // newest snapshot in history
  const timer = useRef<number | undefined>(undefined);
  const [, bump] = useState(0); // force re-render so can-undo/redo refresh

  const commit = useCallback((next: KnobParams) => {
    window.clearTimeout(timer.current);
    if (same(next, committed.current)) return;
    past.current.push(committed.current);
    committed.current = next;
    future.current = [];
    bump((v) => v + 1);
  }, []);

  // Live edit: update immediately, schedule a debounced commit.
  const setParams = useCallback(
    (next: KnobParams) => {
      setPresent(next);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => commit(next), COMMIT_MS);
    },
    [commit],
  );

  // Discrete action: update and commit at once.
  const replaceParams = useCallback(
    (next: KnobParams) => {
      setPresent(next);
      commit(next);
    },
    [commit],
  );

  const undo = useCallback(() => {
    window.clearTimeout(timer.current);
    // Fold any in-flight (uncommitted) edit into history so it's redoable.
    if (!same(present, committed.current)) commit(present);
    if (past.current.length === 0) return;
    const prev = past.current.pop()!;
    future.current.unshift(committed.current);
    committed.current = prev;
    setPresent(prev);
    bump((v) => v + 1);
  }, [present, commit]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    const next = future.current.shift()!;
    past.current.push(committed.current);
    committed.current = next;
    setPresent(next);
    bump((v) => v + 1);
  }, []);

  const canUndo = past.current.length > 0 || !same(present, committed.current);
  const canRedo = future.current.length > 0;

  return { params: present, setParams, replaceParams, undo, redo, canUndo, canRedo };
}
