import { useRef, useState } from "react";
import { PresetGallery, MyPresetGallery } from "./PresetGallery";
import { PRESETS, type KnobPreset } from "../cad/presets";
import {
  SHAFTS,
  bulgeRange,
  clampParams,
  minBodyDiameter,
  maxFluteDepth,
  maxIndicatorDepth,
  maxIndicatorReach,
  maxCornerRadius,
  maxDomeHeight,
  maxLobeDepth,
  maxShaftHoleDepth,
  maxSkirtHeight,
  minSkirtDiameter,
  maxTopEdgeSize,
  maxTopRecessDepth,
  maxTopRimWidth,
  type BodyShape,
  type IndicatorType,
  type KnobParams,
  type ShaftType,
  type SkirtStyle,
  type SurfaceTexture,
  type TickRing,
  type TopEdgeStyle,
  type TopStyle,
} from "../cad/params";

const BODY_SHAPE_LABELS: Record<BodyShape, string> = {
  round: "丸（円）",
  polygon: "多角形",
  lobed: "波型（ロブ）",
  pointer: "指針（チキンヘッド）",
};

const SKIRT_LABELS: Record<SkirtStyle, string> = {
  none: "なし",
  flange: "フランジ（裾段）",
};

const TEXTURE_LABELS: Record<SurfaceTexture, string> = {
  none: "なし（つるつる）",
  flutes: "縦溝（ローレット）",
  helical: "斜め（ヘリカル）",
  diamond: "綾目（ダイヤ）",
  rings: "横溝（リング）",
  scallops: "指スクープ",
};

const TEXTURE_COUNT_LABEL: Record<SurfaceTexture, string> = {
  none: "本数",
  flutes: "本数",
  helical: "本数",
  diamond: "本数（各方向）",
  rings: "段数",
  scallops: "スクープ数",
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
  dome: "ドーム（凸）",
};

interface ControlsProps {
  params: KnobParams;
  onChange: (next: KnobParams) => void;
  busy: boolean;
  busyLabel: string;
  onExport: (format: "stl" | "step") => void;
  onExportFitTest: () => void;
  onSaveJson: () => void;
  onLoadFile: (file: File) => void;
  onCopyOrder: () => void;
  onApplyText: (text: string) => void;
  onPreset: (preset: KnobPreset) => void;
  activePresetId: string | null;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onRandom: () => void;
  onCopyLink: () => void;
  myPresets: KnobPreset[];
  onSavePreset: () => void;
  onDeletePreset: (id: string) => void;
  error: string | null;
  notice: string | null;
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

/** Collapsible category. Collapsed headers show a one-line summary of current values. */
function Section(props: {
  id: string;
  title: string;
  summary?: string;
  open: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <section className={`acc${props.open ? " is-open" : ""}`}>
      <button
        type="button"
        className="acc__head"
        aria-expanded={props.open}
        onClick={() => props.onToggle(props.id)}
      >
        <span className="acc__title">{props.title}</span>
        {!props.open && props.summary && (
          <span className="acc__summary">{props.summary}</span>
        )}
        <span className="acc__chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {props.open && <div className="acc__body">{props.children}</div>}
    </section>
  );
}

/** Short form of a toggle label: drop the parenthesised qualifier. */
const short = (label: string) => label.split("（")[0];

const OPEN_SECTIONS_KEY = "everyday-knobs.openSections";

export function Controls({
  params,
  onChange,
  busy,
  busyLabel,
  onExport,
  onExportFitTest,
  onSaveJson,
  onLoadFile,
  onCopyOrder,
  onApplyText,
  onPreset,
  activePresetId,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onRandom,
  onCopyLink,
  myPresets,
  onSavePreset,
  onDeletePreset,
  error,
  notice,
}: ControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [codeText, setCodeText] = useState("");

  // Which accordion categories are open (persisted across sessions).
  const [openIds, setOpenIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(OPEN_SECTIONS_KEY);
      if (raw) return JSON.parse(raw) as string[];
    } catch {
      /* private mode etc. — fall through to default */
    }
    return ["gallery", "shape"];
  });
  const toggleSection = (id: string) => {
    setOpenIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(OPEN_SECTIONS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  const sec = (id: string) => ({ id, open: openIds.includes(id), onToggle: toggleSection });

  // All edits funnel through clampParams so values can never go degenerate.
  const set = (patch: Partial<KnobParams>) => onChange(clampParams({ ...params, ...patch }));

  const minDia = minBodyDiameter(params);
  const maxDepth = maxShaftHoleDepth(params);
  const maxEdge = maxTopEdgeSize(params);
  const maxRecess = maxTopRecessDepth(params);
  const maxFlute = maxFluteDepth(params);
  const maxRim = maxTopRimWidth(params);
  const maxIndDepth = maxIndicatorDepth(params);
  const maxReach = maxIndicatorReach(params);
  const minSkirt = minSkirtDiameter(params);
  const maxSkirt = maxSkirtHeight(params);
  const maxCorner = maxCornerRadius(params);
  const maxLobe = maxLobeDepth(params);
  const maxDome = maxDomeHeight(params);

  return (
    <aside className="panel">
      <h1 className="panel__title">everyday knobs</h1>
      <p className="panel__subtitle">1日1ノブ ジェネレーター</p>

      <div className="actions">
        <button onClick={onUndo} disabled={!canUndo} title="元に戻す (Ctrl+Z)">
          ↶ 戻す
        </button>
        <button onClick={onRedo} disabled={!canRedo} title="やり直し (Ctrl+Shift+Z)">
          ↷ 進む
        </button>
        <button className="actions__random" onClick={onRandom} title="ランダムに生成">
          🎲 ランダム
        </button>
      </div>

      <Section
        {...sec("gallery")}
        title="ギャラリー"
        summary={
          [...PRESETS, ...myPresets].find((p) => p.id === activePresetId)?.name ??
          `${PRESETS.length}作例`
        }
      >
        <PresetGallery onPick={onPreset} activeId={activePresetId} />
        <div className="mypreset-head">
          <h3 className="subgroup__title">マイプリセット</h3>
          <button className="mypreset-save" onClick={onSavePreset}>
            ＋ 現在の設定を保存
          </button>
        </div>
        <MyPresetGallery
          presets={myPresets}
          onPick={onPreset}
          onDelete={onDeletePreset}
          activeId={activePresetId}
        />
      </Section>

      <Section
        {...sec("shaft")}
        title="軸・取り付け"
        summary={`${params.shaft}・φ${(
          SHAFTS[params.shaft].outerDiameter + 2 * params.shaftClearance
        ).toFixed(2)}`}
      >
        <h3 className="subgroup__title">対象エンコーダ（軸タイプ）</h3>
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
        <h3 className="subgroup__title">軸穴</h3>
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
          min={-0.1}
          max={0.6}
          step={0.05}
          onChange={(v) => set({ shaftClearance: v })}
        />
        <p className="hint">
          軸穴 実寸 φ{(SHAFTS[params.shaft].outerDiameter + 2 * params.shaftClearance).toFixed(2)}
          {SHAFTS[params.shaft].flatDistance !== undefined &&
            ` ／ Dカット面 ${(SHAFTS[params.shaft].flatDistance! + params.shaftClearance).toFixed(2)}mm`}
          （マイナス=きつめ圧入）。入口には0.5mmの挿入面取りが自動で付きます
        </p>
      </Section>

      <Section
        {...sec("shape")}
        title="本体形状・サイズ"
        summary={`${short(BODY_SHAPE_LABELS[params.bodyShape])} φ${params.bodyDiameter}×H${params.bodyHeight}`}
      >
        <h3 className="subgroup__title">本体形状</h3>
        <div className="toggle">
          {(Object.keys(BODY_SHAPE_LABELS) as BodyShape[]).map((s) => (
            <button
              key={s}
              className={`toggle__btn${params.bodyShape === s ? " is-active" : ""}`}
              onClick={() => set({ bodyShape: s })}
            >
              {BODY_SHAPE_LABELS[s]}
            </button>
          ))}
        </div>
        {params.bodyShape === "polygon" && (
          <>
            <Slider
              label="角数"
              value={params.polygonSides}
              min={3}
              max={8}
              step={1}
              unit="角"
              onChange={(v) => set({ polygonSides: v })}
            />
            <Slider
              label="角の丸み"
              value={params.cornerRadius}
              min={0}
              max={Math.max(0, maxCorner)}
              step={0.1}
              onChange={(v) => set({ cornerRadius: v })}
            />
          </>
        )}
        {params.bodyShape === "lobed" && (
          <>
            <Slider
              label="ロブ数（山）"
              value={params.lobeCount}
              min={3}
              max={12}
              step={1}
              unit="山"
              onChange={(v) => set({ lobeCount: v })}
            />
            <Slider
              label="ロブの深さ"
              value={params.lobeDepth}
              min={0.3}
              max={Math.max(0.3, maxLobe)}
              step={0.1}
              onChange={(v) => set({ lobeDepth: v })}
            />
            <p className="hint">断面を波打たせた花びら/歯車風。径=山の平均</p>
          </>
        )}
        {params.bodyShape === "pointer" && (
          <>
            <Slider
              label="指針の長さ"
              value={params.pointerLength}
              min={1}
              max={30}
              step={1}
              onChange={(v) => set({ pointerLength: v })}
            />
            <p className="hint">本体が指針になる涙滴型。向きは「指標 → 位置（角度）」で調整</p>
          </>
        )}
        <h3 className="subgroup__title">サイズ</h3>
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
        {params.bodyShape === "round" && (
          <>
            <Slider
              label="胴のふくらみ"
              value={params.bodyBulge}
              min={bulgeRange(params)[0]}
              max={bulgeRange(params)[1]}
              step={0.5}
              onChange={(v) => set({ bodyBulge: v })}
            />
            <p className="hint">＋で樽型、−でくびれ（鼓）。0で直胴/テーパー</p>
          </>
        )}
      </Section>

      <Section
        {...sec("top")}
        title="天面"
        summary={`${short(TOP_EDGE_LABELS[params.topEdgeStyle])}・${short(TOP_STYLE_LABELS[params.topStyle])}`}
      >
        <h3 className="subgroup__title">天面エッジ</h3>
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
        <h3 className="subgroup__title">天面スタイル</h3>
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
              label={
                params.topStyle === "recess"
                  ? "凹み深さ"
                  : params.topStyle === "dish"
                    ? "すり鉢深さ"
                    : "ドーム高さ"
              }
              value={params.topRecessDepth}
              min={0.4}
              max={Math.max(0.4, params.topStyle === "dome" ? maxDome : maxRecess)}
              step={0.1}
              onChange={(v) => set({ topRecessDepth: v })}
            />
            {params.topStyle !== "dome" && (
              <Slider
                label="縁の幅"
                value={params.topRimWidth}
                min={0.5}
                max={maxRim}
                step={0.1}
                onChange={(v) => set({ topRimWidth: v })}
              />
            )}
          </>
        )}
        {maxRecess < 0.4 && (params.topStyle === "recess" || params.topStyle === "dish") && (
          <p className="hint">軸穴を浅くすると凹みを深くできます</p>
        )}
      </Section>

      <Section
        {...sec("side")}
        title="側面"
        summary={`${short(TEXTURE_LABELS[params.surfaceTexture])}${params.skirt === "flange" ? "・フランジ" : ""}`}
      >
        <h3 className="subgroup__title">側面テクスチャ</h3>
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
        {params.surfaceTexture !== "none" && (
          <>
            <Slider
              label={TEXTURE_COUNT_LABEL[params.surfaceTexture]}
              value={params.fluteCount}
              min={params.surfaceTexture === "scallops" ? 3 : 6}
              max={48}
              step={1}
              unit={
                params.surfaceTexture === "rings"
                  ? "段"
                  : params.surfaceTexture === "scallops"
                    ? "個"
                    : "本"
              }
              onChange={(v) => set({ fluteCount: v })}
            />
            <Slider
              label={params.surfaceTexture === "scallops" ? "スクープ深さ" : "溝の深さ"}
              value={params.fluteDepth}
              min={0.2}
              max={Math.max(0.2, maxFlute)}
              step={0.1}
              onChange={(v) => set({ fluteDepth: v })}
            />
            {(params.surfaceTexture === "flutes" ||
              params.surfaceTexture === "helical" ||
              params.surfaceTexture === "diamond") && (
              <Slider
                label="溝の太さ"
                value={params.fluteWidthPercent}
                min={40}
                max={120}
                step={5}
                unit="%"
                onChange={(v) => set({ fluteWidthPercent: v })}
              />
            )}
            {(params.surfaceTexture === "helical" || params.surfaceTexture === "diamond") && (
              <Slider
                label="ねじれ角"
                value={params.knurlAngle}
                min={10}
                max={30}
                step={1}
                unit="°"
                onChange={(v) => set({ knurlAngle: v })}
              />
            )}
          </>
        )}
        {(params.surfaceTexture === "helical" ||
          params.surfaceTexture === "diamond" ||
          params.surfaceTexture === "rings") && (
          <p className="hint">
            ※ 操作中は滑面プレビュー → 手を止めると数秒でテクスチャを仕上げます
          </p>
        )}
        <h3 className="subgroup__title">スカート（裾）</h3>
        <div className="toggle">
          {(Object.keys(SKIRT_LABELS) as SkirtStyle[]).map((s) => (
            <button
              key={s}
              className={`toggle__btn${params.skirt === s ? " is-active" : ""}`}
              onClick={() => set({ skirt: s })}
            >
              {SKIRT_LABELS[s]}
            </button>
          ))}
        </div>
        {params.skirt === "flange" && (
          <>
            <Slider
              label="裾の径"
              value={params.skirtDiameter}
              min={minSkirt}
              max={70}
              step={1}
              onChange={(v) => set({ skirtDiameter: v })}
            />
            <Slider
              label="裾の高さ"
              value={params.skirtHeight}
              min={1}
              max={maxSkirt}
              step={0.5}
              onChange={(v) => set({ skirtHeight: v })}
            />
          </>
        )}
      </Section>

      <Section
        {...sec("marks")}
        title="指標・目盛り"
        summary={`${short(INDICATOR_LABELS[params.indicator])}${params.tickRing === "ticks" ? `・目盛り${params.tickCount}本` : ""}`}
      >
        <h3 className="subgroup__title">指標（天面）</h3>
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
        <h3 className="subgroup__title">目盛り（ティック）</h3>
        <div className="toggle">
          {(["none", "ticks"] as TickRing[]).map((t) => (
            <button
              key={t}
              className={`toggle__btn${params.tickRing === t ? " is-active" : ""}`}
              onClick={() => set({ tickRing: t })}
            >
              {t === "none" ? "なし" : "目盛りあり"}
            </button>
          ))}
        </div>
        {params.tickRing === "ticks" && (
          <>
            <Slider
              label="本数"
              value={params.tickCount}
              min={4}
              max={60}
              step={1}
              unit="本"
              onChange={(v) => set({ tickCount: v })}
            />
            <Slider
              label="主目盛り間隔"
              value={params.tickMajorEvery}
              min={0}
              max={12}
              step={1}
              unit={params.tickMajorEvery === 0 ? "（なし）" : "本ごと"}
              onChange={(v) => set({ tickMajorEvery: v })}
            />
            <Slider
              label="角度範囲"
              value={params.tickSpan}
              min={60}
              max={360}
              step={10}
              unit="°"
              onChange={(v) => set({ tickSpan: v })}
            />
            <p className="hint">
              {params.tickSpan >= 360 ? "全周リング" : "上方中心の弧（下に開口）"}・
              縁内側に0.4mm彫り。主目盛りは長く太く
            </p>
          </>
        )}
      </Section>

      <Section
        {...sec("print")}
        title="印刷サポート"
        summary={
          params.bottomChamfer > 0.05
            ? `底面取り ${params.bottomChamfer.toFixed(1)}mm`
            : "標準"
        }
      >
        <Slider
          label="底面の面取り"
          value={params.bottomChamfer}
          min={0}
          max={0.6}
          step={0.1}
          onChange={(v) => set({ bottomChamfer: v })}
        />
        <p className="hint">
          1層目の太り（エレファントフット）対策。0 = なし
          {params.bodyShape === "polygon" &&
            params.cornerRadius > 0.05 &&
            params.skirt !== "flange" &&
            "（角丸多角形の底面には適用されません）"}
        </p>
        <button className="order-btn" disabled={busy} onClick={onExportFitTest}>
          公差テストピースをSTL書き出し
        </button>
        <p className="hint">
          現在の公差を中心に 0.05mm 刻みで5段（−0.05〜+0.15）のソケットを並べた試し刷り用。
          天面の刻み目 1〜5 が順番（2 = 現在値）。一度のプリントでベストフィットを特定できます
        </p>
      </Section>

      <Section {...sec("export")} title="書き出し・共有" summary="STL / STEP / JSON / 注文コード">
        <h3 className="subgroup__title">3Dデータ書き出し</h3>
        <div className="export">
          <button disabled={busy} onClick={() => onExport("stl")}>
            STL
          </button>
          <button disabled={busy} onClick={() => onExport("step")}>
            STEP
          </button>
        </div>
        <h3 className="subgroup__title">共有リンク</h3>
        <button className="order-btn" onClick={onCopyLink}>
          🔗 共有リンクをコピー
        </button>
        <p className="hint">
          現在の設定をURLに埋め込んでコピー。開くだけで同じノブが再現されます（URLは常に最新に同期）。
        </p>

        <h3 className="subgroup__title">設定の保存・読込</h3>
        <div className="export">
          <button onClick={onSaveJson}>JSON保存</button>
          <button onClick={() => fileInputRef.current?.click()}>JSON読込</button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json,.txt"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onLoadFile(f);
            e.target.value = "";
          }}
        />
        <h3 className="subgroup__title">カスタムオーダー</h3>
        <p className="hint">
          このノブをメーカーに作ってもらう注文コード。コピーして送ると同じ設定で再現・プリントできます。
        </p>
        <button className="order-btn" onClick={onCopyOrder}>
          注文コードをコピー
        </button>
        <div className="code-apply">
          <input
            type="text"
            className="code-input"
            placeholder="注文コード / JSON を貼り付け"
            value={codeText}
            onChange={(e) => setCodeText(e.target.value)}
          />
          <button
            disabled={!codeText.trim()}
            onClick={() => {
              onApplyText(codeText);
              setCodeText("");
            }}
          >
            読込
          </button>
        </div>
      </Section>

      <div className={`status${busy ? " is-busy" : ""}`}>
        {error ? `⚠ ${error}` : notice ? `✓ ${notice}` : busy ? busyLabel : "プレビュー更新済み"}
      </div>
    </aside>
  );
}
