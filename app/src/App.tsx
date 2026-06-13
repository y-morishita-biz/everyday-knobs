import { useEffect, useState } from "react";
import { cad } from "./cad/cadClient";
import { DEFAULT_PARAMS } from "./cad/params";
import { encodeOrderCode, parseConfig, serializeConfig } from "./cad/config";
import { PRESETS, type KnobPreset } from "./cad/presets";
import { randomParams } from "./cad/random";
import { useKnobMesh } from "./cad/useKnobMesh";
import { useUndoableParams } from "./cad/useUndoableParams";
import type { ExportFormat } from "./worker/cad.worker";
import { Controls } from "./ui/Controls";
import { Viewer } from "./viewer/Viewer";

export default function App() {
  const { params, setParams, replaceParams, undo, redo, canUndo, canRedo } =
    useUndoableParams(DEFAULT_PARAMS);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

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

  // Highlight a preset only while the params still match it exactly.
  const paramsKey = JSON.stringify(params);
  const activePresetId =
    PRESETS.find((p) => JSON.stringify(p.params) === paramsKey)?.id ?? null;

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

  // Keyboard: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z or Ctrl+Y = redo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

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
        error={error}
        notice={notice}
      />
      <Viewer mesh={mesh} />
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
