// User-saved presets, persisted in localStorage. Each saved config is sanitized
// through clampParams on load so old/edited entries can never break a build.

import { clampParams } from "./params";
import type { KnobPreset } from "./presets";

const KEY = "everyday-knobs.myPresets";

export function loadMyPresets(): KnobPreset[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as KnobPreset[];
    if (!Array.isArray(list)) return [];
    return list
      .filter((p) => p && typeof p.id === "string" && typeof p.name === "string" && p.params)
      .map((p) => ({ ...p, note: p.note ?? "マイプリセット", params: clampParams(p.params) }));
  } catch {
    return [];
  }
}

export function saveMyPresets(presets: KnobPreset[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(presets));
  } catch {
    /* quota / private mode — ignore */
  }
}
