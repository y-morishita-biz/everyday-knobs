import { useEffect } from "react";

const SHORTCUTS: [string, string][] = [
  ["Ctrl / ⌘ + Z", "元に戻す"],
  ["Ctrl / ⌘ + Shift + Z", "やり直し"],
  ["R", "ランダム生成"],
  ["F", "ビューをフィット"],
  ["1 / 2 / 3", "視点（斜め / 正面 / 上）"],
  ["0", "自動回転 オン・オフ"],
  ["?", "このヘルプ"],
];

/** Welcome / shortcuts overlay. Shown once on first visit, reopenable with ? or the help button. */
export function HelpOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="overlay__card"
        role="dialog"
        aria-modal="true"
        aria-label="ヘルプ"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="overlay__title">everyday knobs へようこそ 🎛️</h2>
        <p className="overlay__lead">
          ALPS ロータリーエンコーダ用のツマミを、ブラウザでパラメトリックに作って STL / STEP
          で書き出せます。サーバー不要・全部この画面で完結。
        </p>

        <ol className="overlay__steps">
          <li>
            <b>ギャラリー</b>から近い作例を選んで出発
          </li>
          <li>
            カテゴリを開いて<b>スライダー / トグル</b>で調整（🎲ランダムも）
          </li>
          <li>
            ビューの<b>📷PNG</b>や、<b>STL / STEP</b>で書き出し → 印刷・共有
          </li>
        </ol>

        <h3 className="overlay__subtitle">キーボードショートカット</h3>
        <table className="overlay__keys">
          <tbody>
            {SHORTCUTS.map(([k, d]) => (
              <tr key={k}>
                <td>
                  <kbd>{k}</kbd>
                </td>
                <td>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className="order-btn overlay__close" onClick={onClose} autoFocus>
          はじめる
        </button>
      </div>
    </div>
  );
}
