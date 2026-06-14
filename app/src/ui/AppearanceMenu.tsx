import { useEffect, useRef, useState } from "react";
import type { Theme } from "../useTheme";

const SWATCHES = [
  "#9d7bff", // violet (default)
  "#ff6b9d", // pink
  "#ff8a5c", // coral
  "#ffce54", // amber
  "#4cd4b0", // teal
  "#4ca3ff", // blue
  "#a0d468", // green
  "#8a93a3", // slate
];

interface Props {
  theme: Theme;
  onSetTheme: (t: Theme) => void;
  accent: string | null;
  onSetAccent: (hex: string | null) => void;
}

/** Gear button → popover holding theme switch + accent color picker. */
export function AppearanceMenu({ theme, onSetTheme, accent, onSetAccent }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="appmenu" ref={ref}>
      <button
        className="theme-toggle"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="外観設定（テーマ・カラー）"
        title="外観設定（テーマ・カラー）"
        onClick={() => setOpen((o) => !o)}
      >
        ⚙
      </button>

      {open && (
        <div className="appmenu__pop" role="dialog" aria-label="外観設定">
          <div className="appmenu__group">
            <span className="appmenu__label">テーマ</span>
            <div className="seg">
              <button
                className={theme === "dark" ? "is-active" : undefined}
                onClick={() => onSetTheme("dark")}
              >
                🌙 ダーク
              </button>
              <button
                className={theme === "light" ? "is-active" : undefined}
                onClick={() => onSetTheme("light")}
              >
                ☀ ライト
              </button>
            </div>
          </div>

          <div className="appmenu__group">
            <span className="appmenu__label">アクセントカラー</span>
            <div className="swatches">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  className={`swatch${accent === c ? " is-sel" : ""}`}
                  style={{ background: c }}
                  title={c}
                  aria-label={`カラー ${c}`}
                  onClick={() => onSetAccent(c)}
                />
              ))}
              <label className="swatch swatch--custom" title="カスタム色">
                <input
                  type="color"
                  value={accent ?? "#9d7bff"}
                  onChange={(e) => onSetAccent(e.target.value)}
                />
              </label>
            </div>
            <button className="appmenu__reset" onClick={() => onSetAccent(null)}>
              テーマ既定の色に戻す
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
