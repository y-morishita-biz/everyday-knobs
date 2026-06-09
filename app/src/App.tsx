import { useEffect, useRef, useState } from "react";
import { cad } from "./cad/cadClient";
import { DEFAULT_PARAMS, type KnobParams } from "./cad/params";
import type { ExportFormat, MeshPayload } from "./worker/cad.worker";
import { Controls } from "./ui/Controls";
import { Viewer } from "./viewer/Viewer";

export default function App() {
  const [params, setParams] = useState<KnobParams>(DEFAULT_PARAMS);
  const [mesh, setMesh] = useState<MeshPayload | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Monotonic id so out-of-order worker responses are ignored.
  const requestId = useRef(0);

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
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `knob-${params.shaft}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エクスポートに失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <Controls
        params={params}
        onChange={setParams}
        busy={busy}
        onExport={handleExport}
        error={error}
      />
      <Viewer mesh={mesh} />
    </div>
  );
}
