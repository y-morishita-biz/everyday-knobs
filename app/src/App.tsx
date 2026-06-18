import { useEffect, useRef, useState } from "react";
import { cad } from "./cad/cadClient";
import { DEFAULT_PARAMS, type KnobParams } from "./cad/params";
import { encodeOrderCode, parseConfig, serializeConfig } from "./cad/config";
import { PRESETS, type KnobPreset } from "./cad/presets";
import { loadMyPresets, saveMyPresets } from "./cad/myPresets";
import { randomParams } from "./cad/random";
import { useKnobMesh } from "./cad/useKnobMesh";
import { useUndoableParams } from "./cad/useUndoableParams";
import { useTheme } from "./useTheme";
import { useAccent } from "./useAccent";
import type { ExportFormat } from "./worker/cad.worker";
import { Controls } from "./ui/Controls";
import { HelpOverlay } from "./ui/HelpOverlay";
import { Viewer } from "./viewer/Viewer";

const ONBOARDED_KEY = "everyday-knobs.onboarded";

/**
 * Decode params from the URL hash. Supports a shared order code (#c=…) or a
 * built-in preset id (#preset=…) — the latter lets the landing-page gallery
 * deep-link straight into a configured knob.
 */
function paramsFromHash(): KnobParams | null {
  const hash = window.location.hash;
  const pre = hash.match(/[#&]preset=([\w-]+)/);
  if (pre) {
    const found = PRESETS.find((p) => p.id === pre[1]);
    if (found) return found.params;
  }
  const m = hash.match(/[#&]c=([^&]+)/);
  if (!m) return null;
  try {
    return parseConfig(decodeURIComponent(m[1]));
  } catch {
    return null;
  }
}

export default function App() {
  const { params, setParams, replaceParams, undo, redo, canUndo, canRedo } =
    useUndoableParams(paramsFromHash() ?? DEFAULT_PARAMS);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [myPresets, setMyPresets] = useState<KnobPreset[]>(loadMyPresets);
  const [theme, setTheme] = useTheme();
  const { accent, setAccent } = useAccent();
  const [helpOpen, setHelpOpen] = useState(false);

  // First-run welcome overlay.
  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDED_KEY)) {
        setHelpOpen(true);
        localStorage.setItem(ONBOARDED_KEY, "1");
      }
    } catch {
      /* private mode — skip */
    }
  }, []);

  // Preview mesh is driven by a coalescing, two-phase scheduler (see the hook).
  const { mesh, busy, phase, buildError } = useKnobMesh(params);
  const error = actionError ?? buildError;
  const busyLabel = exporting
    ? "書き出し中…"
    : phase === "refining"
      ? "仕上げ中…（テクスチャ生成）"
      : "プレビュー生成中…";

  // Show a transient success message, clearing any standing action error.
  const flash = (msg: string) => {
    setActionError(null);
    setNotice(msg);
    window.setTimeout(() => setNotice((n) => (n === msg ? null : n)), 2500);
  };

  const handleExport = async (format: ExportFormat) => {
    try {
      setExporting(true);
      const blob = await cad.exportModel(params, format);
      downloadBlob(blob, `knob-${params.shaft}.${format}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "エクスポートに失敗しました");
    } finally {
      setExporting(false);
    }
  };

  const applyPreset = (preset: KnobPreset) => {
    replaceParams(preset.params);
    flash(`「${preset.name}」を読み込みました`);
  };

  const handleRandom = () => {
    replaceParams(randomParams());
    flash("ランダム生成しました");
  };

  // Highlight a preset (built-in or saved) while the params still match it exactly.
  const paramsKey = JSON.stringify(params);
  const activePresetId =
    [...PRESETS, ...myPresets].find((p) => JSON.stringify(p.params) === paramsKey)?.id ??
    null;

  // Keep the URL hash in sync so the address bar is always shareable / reloadable.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const code = encodeOrderCode(params);
      window.history.replaceState(null, "", `${window.location.pathname}#c=${code}`);
    }, 300);
    return () => window.clearTimeout(id);
  }, [params]);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#c=${encodeOrderCode(params)}`;
    try {
      await navigator.clipboard.writeText(url);
      flash("共有リンクをコピーしました");
    } catch {
      window.prompt("共有リンクをコピーしてください", url);
    }
  };

  const handleSavePreset = () => {
    const name = window.prompt("マイプリセット名")?.trim();
    if (!name) return;
    const preset: KnobPreset = {
      id: `my-${Date.now()}`,
      name,
      note: "マイプリセット",
      params,
    };
    const next = [...myPresets, preset];
    setMyPresets(next);
    saveMyPresets(next);
    flash(`「${name}」を保存しました`);
  };

  const handleDeletePreset = (id: string) => {
    const next = myPresets.filter((p) => p.id !== id);
    setMyPresets(next);
    saveMyPresets(next);
  };

  const handleExportFitTest = async () => {
    try {
      setExporting(true);
      const blob = await cad.exportFitTest(params);
      downloadBlob(blob, `fit-test-${params.shaft}.stl`);
      flash("テストピースを書き出しました");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "書き出しに失敗しました");
    } finally {
      setExporting(false);
    }
  };

  const handleSaveJson = () => {
    const blob = new Blob([serializeConfig(params)], { type: "application/json" });
    downloadBlob(blob, `knob-${params.shaft}-config.json`);
    flash("設定を保存しました");
  };

  const applyText = (text: string) => {
    try {
      replaceParams(parseConfig(text));
      flash("設定を読み込みました");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "読み込みに失敗しました");
    }
  };

  // Keyboard shortcuts. Latest handlers are read from a ref so the listener is
  // attached once. Undo/redo on Ctrl/Cmd; R = random, ? = help (no modifier).
  const keyActions = useRef({ undo, redo, random: handleRandom, toggleHelp: () => {} });
  keyActions.current = { undo, redo, random: handleRandom, toggleHelp: () => setHelpOpen((o) => !o) };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const a = keyActions.current;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z" && !e.shiftKey) {
        e.preventDefault();
        a.undo();
      } else if (mod && ((key === "z" && e.shiftKey) || key === "y")) {
        e.preventDefault();
        a.redo();
      } else if (!mod && key === "r") {
        e.preventDefault();
        a.random();
      } else if (!mod && (e.key === "?" || (e.key === "/" && e.shiftKey))) {
        e.preventDefault();
        a.toggleHelp();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLoadFile = async (file: File) => {
    try {
      applyText(await file.text());
    } catch {
      setActionError("ファイルを読めませんでした");
    }
  };

  const handleCopyOrder = async () => {
    const code = encodeOrderCode(params);
    try {
      await navigator.clipboard.writeText(code);
      flash("注文コードをコピーしました");
    } catch {
      // Clipboard blocked (e.g. insecure context): fall back to a prompt.
      window.prompt("注文コードをコピーしてください", code);
    }
  };

  return (
    <div className="app">
      <Controls
        params={params}
        onChange={setParams}
        busy={busy || exporting}
        busyLabel={busyLabel}
        onExport={handleExport}
        onExportFitTest={handleExportFitTest}
        onSaveJson={handleSaveJson}
        onLoadFile={handleLoadFile}
        onCopyOrder={handleCopyOrder}
        onApplyText={applyText}
        onPreset={applyPreset}
        activePresetId={activePresetId}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onRandom={handleRandom}
        onCopyLink={handleCopyLink}
        myPresets={myPresets}
        onSavePreset={handleSavePreset}
        onDeletePreset={handleDeletePreset}
        theme={theme}
        onSetTheme={setTheme}
        accent={accent}
        onSetAccent={setAccent}
        onHelp={() => setHelpOpen(true)}
        error={error}
        notice={notice}
      />
      <Viewer mesh={mesh} theme={theme} accent={accent} />
      <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
