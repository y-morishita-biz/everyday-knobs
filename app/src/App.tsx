import { useEffect, useRef, useState } from "react";
import { cad } from "./cad/cadClient";
import { DEFAULT_PARAMS, type KnobParams } from "./cad/params";
import { encodeOrderCode, parseConfig, serializeConfig } from "./cad/config";
import type { ExportFormat, MeshPayload } from "./worker/cad.worker";
import { Controls } from "./ui/Controls";
import { Viewer } from "./viewer/Viewer";

export default function App() {
  const [params, setParams] = useState<KnobParams>(DEFAULT_PARAMS);
  const [mesh, setMesh] = useState<MeshPayload | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Monotonic id so out-of-order worker responses are ignored.
  const requestId = useRef(0);

  // Show a transient success message, clearing any standing error.
  const flash = (msg: string) => {
    setError(null);
    setNotice(msg);
    window.setTimeout(() => setNotice((n) => (n === msg ? null : n)), 2500);
  };

  // Rebuild the preview whenever parameters change (debounced for slider drags).
  useEffect(() => {
    const id = ++requestId.current;
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const payload = await cad.build(params);
        if (id === requestId.current) {
          setMesh(payload);
          setError(null);
        }
      } catch (err) {
        if (id === requestId.current) {
          setError(err instanceof Error ? err.message : "生成に失敗しました");
        }
      } finally {
        if (id === requestId.current) setBusy(false);
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [params]);

  const handleExport = async (format: ExportFormat) => {
    try {
      setBusy(true);
      const blob = await cad.exportModel(params, format);
      downloadBlob(blob, `knob-${params.shaft}.${format}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エクスポートに失敗しました");
    } finally {
      setBusy(false);
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
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    }
  };

  const handleLoadFile = async (file: File) => {
    try {
      applyText(await file.text());
    } catch {
      setError("ファイルを読めませんでした");
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
        busy={busy}
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
