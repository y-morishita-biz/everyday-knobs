import type { KnobParams } from "../cad/params";
import { PRESETS, type KnobPreset } from "../cad/presets";

/**
 * A small top-down SVG glyph derived from the parameters: the body outline
 * (circle or polygon), a faint skirt ring, texture ticks around the rim, and
 * the indicator. Cheap, asset-free, and distinct enough to tell presets apart.
 */
function PresetGlyph({ p }: { p: KnobParams }) {
  const C = 24;
  const R = 18;
  const at = (ang: number, r: number): [number, number] => [
    +(C + Math.cos(ang) * r).toFixed(2),
    +(C + Math.sin(ang) * r).toFixed(2),
  ];

  let outline;
  if (p.bodyShape === "polygon") {
    const pts: string[] = [];
    for (let i = 0; i < p.polygonSides; i++) {
      const [x, y] = at(-Math.PI / 2 + (i / p.polygonSides) * 2 * Math.PI, R);
      pts.push(`${x},${y}`);
    }
    outline = <polygon points={pts.join(" ")} className="glyph__body" />;
  } else {
    outline = <circle cx={C} cy={C} r={R} className="glyph__body" />;
  }

  const ticks: JSX.Element[] = [];
  if (p.surfaceTexture !== "none") {
    const n = Math.min(p.fluteCount, 28);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * Math.PI;
      const [x1, y1] = at(a, R - 3.5);
      const [x2, y2] = at(a, R);
      ticks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="glyph__tick" />);
    }
  }

  const ia = (p.indicatorAngle * Math.PI) / 180;
  let indicator = null;
  if (p.indicator === "line") {
    const [x1, y1] = at(ia, 4);
    const [x2, y2] = at(ia, R - 3);
    indicator = <line x1={x1} y1={y1} x2={x2} y2={y2} className="glyph__ind" />;
  } else if (p.indicator === "dimple") {
    const [x, y] = at(ia, R * 0.55);
    indicator = <circle cx={x} cy={y} r={2.2} className="glyph__ind glyph__ind--dot" />;
  }

  return (
    <svg viewBox="0 0 48 48" className="glyph" aria-hidden="true">
      {p.skirt === "flange" && <circle cx={C} cy={C} r={R + 2.5} className="glyph__skirt" />}
      {outline}
      {ticks}
      {indicator}
    </svg>
  );
}

interface PresetGalleryProps {
  onPick: (preset: KnobPreset) => void;
  activeId: string | null;
}

export function PresetGallery({ onPick, activeId }: PresetGalleryProps) {
  return (
    <div className="gallery">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          className={`preset${activeId === preset.id ? " is-active" : ""}`}
          onClick={() => onPick(preset)}
          title={preset.note}
        >
          <PresetGlyph p={preset.params} />
          <span className="preset__name">{preset.name}</span>
          <span className="preset__note">{preset.note}</span>
        </button>
      ))}
    </div>
  );
}
