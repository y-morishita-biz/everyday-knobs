import { useCallback, useState } from "react";

export type Theme = "light" | "dark";

const KEY = "everyday-knobs.theme";

/**
 * Light/dark theme synced to <html data-theme>. The initial value is set by an
 * inline script in index.html (avoiding a flash); toggling updates the DOM
 * attribute *synchronously* so any effect that reads CSS variables afterwards
 * (e.g. the Three.js background) sees the new palette immediately.
 */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.dataset.theme as Theme) || "dark",
  );

  const toggle = useCallback(() => {
    const next: Theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode — ignore */
    }
    setTheme(next);
  }, []);

  return [theme, toggle];
}
