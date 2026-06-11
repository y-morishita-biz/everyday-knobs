import { useState } from "react";
import { cad } from "./cad/cadClient";
import { DEFAULT_PARAMS, type KnobParams } from "./cad/params";
import { encodeOrderCode, parseConfig, serializeConfig } from "./cad/config";
import { useKnobMesh } from "./cad/useKnobMesh";
import type { ExportFormat } from "./worker/cad.worker";
import { Controls } from "./ui/Controls";
import { Viewer } from "./viewer/Viewer";

export default function App() {
  const [params, setParams] = useState<KnobParams>(DEFAULT_PARAMS);
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

  const handleSaveJson = () => {
    const blob = new Blob([serializeConfig(params)], { type: "application/json" });
    downloadBlob(blob, `knob-${params.shaft}-config.json`);
    flash("設定を保存しました");
  };

  const applyText = (text: string) => {
    try {
      setParams(parseConfig(text));
      flash("設定を読み込みました");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "読み込みに失敗しました");
    }
  };

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
        onSaveJson={handleSaveJson}
        onLoadFile={handleLoadFile}
        onCopyOrder={handleCopyOrder}
        onApplyText={applyText}
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
