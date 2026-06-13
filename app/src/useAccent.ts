import { useCallback, useState } from "react";

const KEY = "everyday-knobs.accent";

/** Readable text color (dark or white) for a given accent background. */
export function contrastText(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return "#ffffff";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#22252b" : "#ffffff";
}

/**
 * Accent (primary) color override. `null` falls back to the theme's built-in
 * accent; a hex string overrides `--accent` (+ a contrasting `--accent-text`)
 * on the document root. The CSS variables are written *synchronously* so any
 * effect reading them afterwards (the Three.js knob material) sees the new
 * color immediately. Persisted to localStorage.
 */
export function useAccent() {
  const [accent, setAccentState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  });

  const setAccent = useCallback((hex: string | null) => {
    const root = document.documentElement;
    try {
      if (hex) {
        root.style.setProperty("--accent", hex);
        root.style.setProperty("--accent-text", contrastText(hex));
        localStorage.setItem(KEY, hex);
      } else {
        root.style.removeProperty("--accent");
        root.style.removeProperty("--accent-text");
        localStorage.removeItem(KEY);
      }
    } catch {
      /* private mode — ignore */
    }
    setAccentState(hex);
  }, []);

  return { accent, setAccent };
}
