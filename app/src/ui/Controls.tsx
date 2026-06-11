import {
  SHAFTS,
  minBodyDiameter,
  maxFluteDepth,
  maxIndicatorDepth,
  maxIndicatorReach,
  maxShaftHoleDepth,
  maxTopEdgeSize,
  maxTopRecessDepth,
  maxTopRimWidth,
  type IndicatorType,
  type KnobParams,
  type ShaftType,
  type SurfaceTexture,
  type TopEdgeStyle,
  type TopStyle,
} from "../cad/params";

const TEXTURE_LABELS: Record<SurfaceTexture, string> = {
  none: "なし（つるつる）",
  flutes: "縦溝（ローレット）",
};

const INDICATOR_LABELS: Record<IndicatorType, string> = {
  none: "なし",
  line: "刻線（ポインター）",
  dimple: "ディンプル（点）",
};

const TOP_EDGE_LABELS: Record<TopEdgeStyle, string> = {
  none: "なし",
  chamfer: "面取り（チャンファ）",
  fillet: "丸め（フィレット）",
};

const TOP_STYLE_LABELS: Record<TopStyle, string> = {
  flat: "フラット",
  recess: "リセス（一段凹み）",
  dish: "ディッシュ（すり鉢）",
};

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
    if (next.topDiameter < minDia) next.topDiameter = minDia;
    const maxDepth = maxShaftHoleDepth(next);
    if (next.shaftHoleDepth > maxDepth) next.shaftHoleDepth = maxDepth;
    const maxEdge = maxTopEdgeSize(next);
    if (next.topEdgeSize > maxEdge) next.topEdgeSize = maxEdge;
    const maxRecess = maxTopRecessDepth(next);
    if (next.topRecessDepth > maxRecess) next.topRecessDepth = maxRecess;
    const maxFlute = maxFluteDepth(next);
    if (next.fluteDepth > maxFlute) next.fluteDepth = maxFlute;
    const maxRim = maxTopRimWidth(next);
    if (next.topRimWidth > maxRim) next.topRimWidth = maxRim;
    const maxIndDepth = maxIndicatorDepth(next);
    if (next.indicatorDepth > maxIndDepth) next.indicatorDepth = maxIndDepth;
    const maxReach = maxIndicatorReach(next);
    if (next.indicatorReach > maxReach) next.indicatorReach = maxReach;
    onChange(next);
  };

  const minDia = minBodyDiameter(params);
  const maxDepth = maxShaftHoleDepth(params);
  const maxEdge = maxTopEdgeSize(params);
  const maxRecess = maxTopRecessDepth(params);
  const maxFlute = maxFluteDepth(params);
  const maxRim = maxTopRimWidth(params);
  const maxIndDepth = maxIndicatorDepth(params);
  const maxReach = maxIndicatorReach(params);

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
          label="本体径（下部）"
          value={params.bodyDiameter}
          min={minDia}
          max={60}
          step={1}
          onChange={(v) => set({ bodyDiameter: v })}
        />
        <Slider
          label="本体径（上部）"
          value={params.topDiameter}
          min={minDia}
          max={60}
          step={1}
          onChange={(v) => set({ topDiameter: v })}
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
        <h2 className="group__title">天面エッジ</h2>
        <div className="toggle">
          {(Object.keys(TOP_EDGE_LABELS) as TopEdgeStyle[]).map((style) => (
            <button
              key={style}
              className={`toggle__btn${params.topEdgeStyle === style ? " is-active" : ""}`}
              onClick={() => set({ topEdgeStyle: style })}
            >
              {TOP_EDGE_LABELS[style]}
            </button>
          ))}
        </div>
        {params.topEdgeStyle !== "none" && (
          <Slider
            label={params.topEdgeStyle === "chamfer" ? "面取り幅" : "丸め半径"}
            value={params.topEdgeSize}
            min={0.2}
            max={maxEdge}
            step={0.1}
            onChange={(v) => set({ topEdgeSize: v })}
          />
        )}
      </section>

      <section className="group">
        <h2 className="group__title">天面スタイル</h2>
        <div className="toggle">
          {(Object.keys(TOP_STYLE_LABELS) as TopStyle[]).map((style) => (
            <button
              key={style}
              className={`toggle__btn${params.topStyle === style ? " is-active" : ""}`}
              onClick={() => set({ topStyle: style })}
            >
              {TOP_STYLE_LABELS[style]}
            </button>
          ))}
        </div>
        {params.topStyle !== "flat" && (
          <>
            <Slider
              label={params.topStyle === "recess" ? "凹み深さ" : "すり鉢深さ"}
              value={params.topRecessDepth}
              min={0.4}
              max={Math.max(0.4, maxRecess)}
              step={0.1}
              onChange={(v) => set({ topRecessDepth: v })}
            />
            <Slider
              label="縁の幅"
              value={params.topRimWidth}
              min={0.5}
              max={maxRim}
              step={0.1}
              onChange={(v) => set({ topRimWidth: v })}
            />
          </>
        )}
        {maxRecess < 0.4 && params.topStyle !== "flat" && (
          <p className="hint">軸穴を浅くすると凹みを深くできます</p>
        )}
      </section>

      <section className="group">
        <h2 className="group__title">側面テクスチャ</h2>
        <div className="toggle">
          {(Object.keys(TEXTURE_LABELS) as SurfaceTexture[]).map((tex) => (
            <button
              key={tex}
              className={`toggle__btn${params.surfaceTexture === tex ? " is-active" : ""}`}
              onClick={() => set({ surfaceTexture: tex })}
            >
              {TEXTURE_LABELS[tex]}
            </button>
          ))}
        </div>
        {params.surfaceTexture === "flutes" && (
          <>
            <Slider
              label="本数"
              value={params.fluteCount}
              min={8}
              max={48}
              step={1}
              unit="本"
              onChange={(v) => set({ fluteCount: v })}
            />
            <Slider
              label="溝の深さ"
              value={params.fluteDepth}
              min={0.2}
              max={Math.max(0.2, maxFlute)}
              step={0.1}
              onChange={(v) => set({ fluteDepth: v })}
            />
            <Slider
              label="溝の太さ"
              value={params.fluteWidthPercent}
              min={40}
              max={120}
              step={5}
              unit="%"
              onChange={(v) => set({ fluteWidthPercent: v })}
            />
          </>
        )}
      </section>

      <section className="group">
        <h2 className="group__title">指標（天面）</h2>
        <div className="toggle">
          {(Object.keys(INDICATOR_LABELS) as IndicatorType[]).map((type) => (
            <button
              key={type}
              className={`toggle__btn${params.indicator === type ? " is-active" : ""}`}
              onClick={() => set({ indicator: type })}
            >
              {INDICATOR_LABELS[type]}
            </button>
          ))}
        </div>
        {params.indicator !== "none" && (
          <>
            <Slider
              label={params.indicator === "line" ? "線の幅" : "点の径"}
              value={params.indicatorSize}
              min={params.indicator === "line" ? 0.6 : 1}
              max={params.indicator === "line" ? 2.5 : 4}
              step={0.1}
              onChange={(v) => set({ indicatorSize: v })}
            />
            <Slider
              label={params.indicator === "line" ? "線の長さ" : "中心からの距離"}
              value={params.indicatorReach}
              min={2}
              max={maxReach}
              step={0.5}
              onChange={(v) => set({ indicatorReach: v })}
            />
            <Slider
              label="彫り深さ"
              value={params.indicatorDepth}
              min={0.4}
              max={maxIndDepth}
              step={0.1}
              onChange={(v) => set({ indicatorDepth: v })}
            />
            <Slider
              label="位置（角度）"
              value={params.indicatorAngle}
              min={0}
              max={360}
              step={15}
              unit="°"
              onChange={(v) => set({ indicatorAngle: v })}
            />
          </>
        )}
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
