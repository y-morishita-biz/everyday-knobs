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
  } else if (p.bodyShape === "lobed") {
    const steps = Math.max(72, p.lobeCount * 12);
    const meanR = R - 2;
    const amp = Math.min(2.5, (p.lobeDepth / (p.bodyDiameter / 2)) * meanR);
    const pts: string[] = [];
    for (let i = 0; i < steps; i++) {
      const a = -Math.PI / 2 + (i / steps) * 2 * Math.PI;
      const [x, y] = at(a, meanR + amp * Math.cos(p.lobeCount * a));
      pts.push(`${x},${y}`);
    }
    outline = <polygon points={pts.join(" ")} className="glyph__body" />;
  } else if (p.bodyShape === "pointer") {
    const rr = R - 4;
    const dApex = rr + Math.min(R + 4, (p.pointerLength / (p.bodyDiameter / 2)) * rr);
    const beta = Math.acos(Math.min(0.999, rr / dApex));
    const ia = (p.indicatorAngle * Math.PI) / 180;
    const rot = (x: number, y: number): [number, number] => [
      C + (x * Math.cos(ia) - y * Math.sin(ia)),
      C + (x * Math.sin(ia) + y * Math.cos(ia)),
    ];
    const pts: string[] = [];
    const a0 = beta;
    const a1 = 2 * Math.PI - beta;
    const segs = 28;
    for (let i = 0; i <= segs; i++) {
      const a = a0 + (i / segs) * (a1 - a0);
      pts.push(rot(rr * Math.cos(a), rr * Math.sin(a)).join(","));
    }
    pts.push(rot(dApex, 0).join(","));
    outline = <polygon points={pts.join(" ")} className="glyph__body" />;
  } else {
    outline = <circle cx={C} cy={C} r={R} className="glyph__body" />;
  }

  const ticks: JSX.Element[] = [];
  const knurled =
    p.surfaceTexture === "flutes" ||
    p.surfaceTexture === "helical" ||
    p.surfaceTexture === "diamond";
  if (knurled) {
    const n = Math.min(p.fluteCount, 28);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * Math.PI;
      const [x1, y1] = at(a, R - 3.5);
      const [x2, y2] = at(a, R);
      ticks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="glyph__tick" />);
    }
  } else if (p.surfaceTexture === "rings") {
    ticks.push(<circle key="r1" cx={C} cy={C} r={R - 3} className="glyph__ringline" />);
    ticks.push(<circle key="r2" cx={C} cy={C} r={R - 6} className="glyph__ringline" />);
  } else if (p.surfaceTexture === "scallops") {
    const n = Math.min(Math.max(p.fluteCount, 3), 10);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * Math.PI;
      const [x, y] = at(a, R - 1.5);
      ticks.push(<circle key={`s${i}`} cx={x} cy={y} r={2.2} className="glyph__scoop" />);
    }
  }

  const scale: JSX.Element[] = [];
  if (p.tickRing === "ticks") {
    const n = Math.min(p.tickCount, 36);
    const full = p.tickSpan >= 359.5;
    const span = (Math.min(360, Math.max(60, p.tickSpan)) * Math.PI) / 180;
    const step = full ? (2 * Math.PI) / n : span / (n - 1);
    const begin = full ? -Math.PI / 2 : -Math.PI / 2 - span / 2;
    for (let i = 0; i < n; i++) {
      const major = p.tickMajorEvery > 0 && i % p.tickMajorEvery === 0;
      const a = begin + i * step;
      const [x1, y1] = at(a, R - (major ? 6 : 3.5));
      const [x2, y2] = at(a, R - 1);
      scale.push(
        <line
          key={`s${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          className={`glyph__tick${major ? " glyph__tick--major" : ""}`}
        />,
      );
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
      {scale}
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
