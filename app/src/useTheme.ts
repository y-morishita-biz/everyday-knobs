import { useCallback, useState } from "react";

export type Theme = "light" | "dark";

const KEY = "everyday-knobs.theme";

/**
 * Light/dark theme synced to <html data-theme>. The initial value is set by an
 * inline script in index.html (avoiding a flash); toggling updates the DOM
 * attribute *synchronously* so any effect that reads CSS variables afterwards
 * (e.g. the Three.js background) sees the new palette immediately.
 */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(
    () => (document.documentElement.dataset.theme as Theme) || "dark",
  );

  const setTheme = useCallback((next: Theme) => {
    // Update the DOM attribute synchronously so effects reading CSS vars
    // afterwards (e.g. the Three.js background) see the new palette at once.
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode — ignore */
    }
    setThemeState(next);
  }, []);

  return [theme, setTheme];
}
