import {
  SHAFTS,
  minBodyDiameter,
  maxShaftHoleDepth,
  type KnobParams,
  type ShaftType,
} from "../cad/params";

interface ControlsProps {
  params: KnobParams;
  onChange: (next: KnobParams) => void;
  busy: boolean;
  onExport: (format: "stl" | "step") => void;
  error: string | null;
}

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="slider">
      <span className="slider__row">
        <span>{props.label}</span>
        <span className="slider__value">
          {props.value.toFixed(props.step < 1 ? 2 : 0)}
          {props.unit ?? " mm"}
        </span>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function Controls({ params, onChange, busy, onExport, error }: ControlsProps) {
  const set = (patch: Partial<KnobParams>) => {
    const next = { ...params, ...patch };
    // Keep parameters inside the non-degenerate range after any change.
    const minDia = minBodyDiameter(next);
    if (next.bodyDiameter < minDia) next.bodyDiameter = minDia;
    const maxDepth = maxShaftHoleDepth(next);
    if (next.shaftHoleDepth > maxDepth) next.shaftHoleDepth = maxDepth;
    onChange(next);
  };

  const minDia = minBodyDiameter(params);
  const maxDepth = maxShaftHoleDepth(params);

  return (
    <aside className="panel">
      <h1 className="panel__title">everyday knobs</h1>
      <p className="panel__subtitle">1日1ノブ ジェネレーター</p>

      <section className="group">
        <h2 className="group__title">対象エンコーダ（軸タイプ）</h2>
        <div className="toggle">
          {(Object.keys(SHAFTS) as ShaftType[]).map((id) => (
            <button
              key={id}
              className={`toggle__btn${params.shaft === id ? " is-active" : ""}`}
              onClick={() => set({ shaft: id })}
            >
              {SHAFTS[id].label}
            </button>
          ))}
        </div>
      </section>

      <section className="group">
        <h2 className="group__title">本体</h2>
        <Slider
          label="本体径"
          value={params.bodyDiameter}
          min={minDia}
          max={60}
          step={1}
          onChange={(v) => set({ bodyDiameter: v })}
        />
        <Slider
          label="本体高さ"
          value={params.bodyHeight}
          min={4}
          max={40}
          step={1}
          onChange={(v) => set({ bodyHeight: v })}
        />
      </section>

      <section className="group">
        <h2 className="group__title">軸穴</h2>
        <Slider
          label="軸穴 深さ"
          value={params.shaftHoleDepth}
          min={2}
          max={maxDepth}
          step={1}
          onChange={(v) => set({ shaftHoleDepth: v })}
        />
        <Slider
          label="嵌合クリアランス"
          value={params.shaftClearance}
          min={0}
          max={0.6}
          step={0.05}
          onChange={(v) => set({ shaftClearance: v })}
        />
      </section>

      <section className="group">
        <h2 className="group__title">エクスポート</h2>
        <div className="export">
          <button disabled={busy} onClick={() => onExport("stl")}>
            STL
          </button>
          <button disabled={busy} onClick={() => onExport("step")}>
            STEP
          </button>
        </div>
      </section>

      <div className={`status${busy ? " is-busy" : ""}`}>
        {error ? `⚠ ${error}` : busy ? "計算中…" : "プレビュー更新済み"}
      </div>
    </aside>
  );
}
