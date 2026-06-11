// Parameter model for the knob generator.
//
// Shaft specs are taken from the ALPS STEP measurements documented in
// reference/README.md. The knob's shaft socket (the negative shape cut from the
// body) is derived from these values plus an independent clearance parameter.

export type ShaftType = "EC11" | "EC12E";

export interface ShaftSpec {
  id: ShaftType;
  label: string;
  /** Nominal shaft outer diameter the knob fits over (mm). */
  outerDiameter: number;
  /**
   * Distance from the shaft axis to the flat face for a D-cut shaft (mm).
   * Undefined for a plain round shaft. EC11 φ6 with across-flat 4.5mm
   * => flat face sits 1.5mm from the axis.
   */
  flatDistance?: number;
}

export const SHAFTS: Record<ShaftType, ShaftSpec> = {
  // EC1110120005 — EC11 metal shaft, φ6 with a single flat (D-cut), 4.5mm across flat.
  EC11: {
    id: "EC11",
    label: "EC1110120005 (φ6 Dカット軸)",
    outerDiameter: 6.0,
    flatDistance: 1.5,
  },
  // EC12E085 — EC12E hollow shaft. The knob caps over the φ6.05 outer cylinder.
  EC12E: {
    id: "EC12E",
    label: "EC12E085 (φ6 中空軸)",
    outerDiameter: 6.05,
  },
};

export interface KnobParams {
  shaft: ShaftType;
  /** Outer diameter at the base (bottom) of the body (mm). */
  bodyDiameter: number;
  /** Outer diameter at the top of the body (mm). Equal to bodyDiameter = straight cylinder. */
  topDiameter: number;
  /** Total height of the body (mm). */
  bodyHeight: number;
  /** Radial clearance added to the shaft socket for fit (mm). */
  shaftClearance: number;
  /** Depth of the shaft socket measured from the bottom face (mm). */
  shaftHoleDepth: number;
  /** Treatment applied to the top rim edge. */
  topEdgeStyle: TopEdgeStyle;
  /** Chamfer width / fillet radius for the top rim (mm). */
  topEdgeSize: number;
  /** Treatment applied to the top face. */
  topStyle: TopStyle;
  /** Depth of the recess / dish carved into the top face (mm). */
  topRecessDepth: number;
  /** Width of the flat rim ring left around a recess / dish (mm). */
  topRimWidth: number;
  /** Pointer / position indicator on the top face. */
  indicator: IndicatorType;
  /** Line width (line) or dimple diameter (dimple), in mm. */
  indicatorSize: number;
  /** Angular position of the indicator (degrees, 0 = +X / "3 o'clock"). */
  indicatorAngle: number;
  /** Engraving depth of the indicator (mm). */
  indicatorDepth: number;
  /** Radial reach from the center: line length / dimple center distance (mm). */
  indicatorReach: number;
  /** Side-wall texture. */
  surfaceTexture: SurfaceTexture;
  /** Number of vertical flutes around the side. */
  fluteCount: number;
  /** Radial depth each flute bites into the side (mm). */
  fluteDepth: number;
  /** Flute cutter size as a percentage of the angular pitch (40–120). */
  fluteWidthPercent: number;
}

/** Day 2: top rim edge treatment — none, 45° chamfer, or rounded fillet. */
export type TopEdgeStyle = "none" | "chamfer" | "fillet";

/** Day 4: top face treatment — flat, cylindrical recess, or spherical dish. */
export type TopStyle = "flat" | "recess" | "dish";

/** Day 5: top-face indicator — none, an engraved radial line, or an offset dimple. */
export type IndicatorType = "none" | "line" | "dimple";

/** Day 6: side-wall texture — smooth or vertical flutes (straight knurl). */
export type SurfaceTexture = "none" | "flutes";

export const DEFAULT_PARAMS: KnobParams = {
  shaft: "EC11",
  bodyDiameter: 20,
  topDiameter: 20,
  bodyHeight: 16,
  shaftClearance: 0.15,
  shaftHoleDepth: 12,
  topEdgeStyle: "chamfer",
  topEdgeSize: 1.5,
  topStyle: "flat",
  topRecessDepth: 2,
  topRimWidth: 1.5,
  indicator: "line",
  indicatorSize: 1.2,
  indicatorAngle: 90,
  indicatorDepth: 1.0,
  indicatorReach: 8.5,
  surfaceTexture: "none",
  fluteCount: 24,
  fluteDepth: 0.6,
  fluteWidthPercent: 85,
};

/** Minimum wall thickness we keep around the shaft socket and above it (mm). */
export const MIN_WALL = 1.5;

/**
 * Largest radius the shaft socket can reach for a given shaft + clearance (mm).
 * Used to derive the smallest non-degenerate body diameter.
 */
export function shaftSocketRadius(params: KnobParams): number {
  return SHAFTS[params.shaft].outerDiameter / 2 + params.shaftClearance;
}

/** Smallest body diameter that still leaves MIN_WALL around the socket (mm). */
export function minBodyDiameter(params: KnobParams): number {
  return Math.ceil((shaftSocketRadius(params) + MIN_WALL) * 2);
}

/** Deepest socket that still leaves MIN_WALL of material under the top (mm). */
export function maxShaftHoleDepth(params: KnobParams): number {
  return Math.max(2, params.bodyHeight - MIN_WALL);
}

/**
 * Largest chamfer width / fillet radius for the top rim (mm).
 * The treatment is applied to the *top* edge, so the radial budget is taken
 * from the top radius. Bounded so the cut never reaches the shaft socket and
 * a reasonable straight flank remains.
 */
export function maxTopEdgeSize(params: KnobParams): number {
  const radial = params.topDiameter / 2 - shaftSocketRadius(params) - 0.2;
  const vertical = params.bodyHeight * 0.45;
  return Math.max(0, Math.floor(Math.min(radial, vertical) * 10) / 10);
}

/** Radius of the flat top face that remains after the rim edge treatment (mm). */
export function flatTopRadius(params: KnobParams): number {
  const edge =
    params.topEdgeStyle === "none"
      ? 0
      : Math.min(params.topEdgeSize, maxTopEdgeSize(params));
  return params.topDiameter / 2 - edge;
}

/**
 * Deepest top recess / dish that still leaves MIN_WALL of material between the
 * bottom of the recess and the top of the shaft socket (mm).
 */
export function maxTopRecessDepth(params: KnobParams): number {
  const room = params.bodyHeight - params.shaftHoleDepth - MIN_WALL;
  return Math.max(0, Math.floor(room * 10) / 10);
}

/** Widest rim ring that still leaves a ≥2mm-radius depression (mm). */
export function maxTopRimWidth(params: KnobParams): number {
  return Math.max(0.5, Math.floor((flatTopRadius(params) - 2) * 10) / 10);
}

/** Deepest indicator engraving that stays above the shaft socket (mm). */
export function maxIndicatorDepth(params: KnobParams): number {
  const wall =
    params.bodyHeight - Math.min(params.shaftHoleDepth, maxShaftHoleDepth(params));
  return Math.max(0.4, Math.min(2.5, Math.floor((wall - 0.4) * 10) / 10));
}

/** Farthest the indicator can reach from the center (mm). */
export function maxIndicatorReach(params: KnobParams): number {
  const flatR = flatTopRadius(params);
  const margin = params.indicator === "dimple" ? params.indicatorSize / 2 + 0.3 : 0;
  return Math.max(2, Math.floor((flatR - margin) * 10) / 10);
}

/** Mid-height body radius — the reference radius for vertical flutes (mm). */
export function midBodyRadius(params: KnobParams): number {
  return (params.bodyDiameter + params.topDiameter) / 4;
}

/**
 * Deepest a flute can bite while keeping a wall of at least 1.0mm between the
 * flute root and the shaft socket (mm), capped for sane proportions.
 */
export function maxFluteDepth(params: KnobParams): number {
  const room = midBodyRadius(params) - shaftSocketRadius(params) - 1.0;
  return Math.max(0, Math.min(1.5, Math.floor(room * 10) / 10));
}

/**
 * Sanitize an arbitrary (possibly imported / untrusted) parameter object into a
 * valid KnobParams: fill missing fields from defaults, coerce types, validate
 * enums, and clamp every value to its non-degenerate range. This is the single
 * source of truth for parameter validity — used both by live editing and by
 * JSON / order-code import.
 */
export function clampParams(input: Partial<KnobParams>): KnobParams {
  const d = DEFAULT_PARAMS;
  const num = (v: unknown, f: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : f;
  const cl = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const pick = <T extends string>(v: unknown, allowed: readonly T[], f: T): T =>
    typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : f;

  const p: KnobParams = {
    shaft: pick(input.shaft, ["EC11", "EC12E"], d.shaft),
    bodyHeight: cl(num(input.bodyHeight, d.bodyHeight), 4, 40),
    bodyDiameter: cl(num(input.bodyDiameter, d.bodyDiameter), 6, 60),
    topDiameter: cl(num(input.topDiameter, d.topDiameter), 6, 60),
    shaftClearance: cl(num(input.shaftClearance, d.shaftClearance), 0, 0.6),
    shaftHoleDepth: cl(num(input.shaftHoleDepth, d.shaftHoleDepth), 2, 40),
    topEdgeStyle: pick(input.topEdgeStyle, ["none", "chamfer", "fillet"], d.topEdgeStyle),
    topEdgeSize: Math.max(0.2, num(input.topEdgeSize, d.topEdgeSize)),
    topStyle: pick(input.topStyle, ["flat", "recess", "dish"], d.topStyle),
    topRecessDepth: Math.max(0.4, num(input.topRecessDepth, d.topRecessDepth)),
    topRimWidth: Math.max(0.5, num(input.topRimWidth, d.topRimWidth)),
    indicator: pick(input.indicator, ["none", "line", "dimple"], d.indicator),
    indicatorSize: cl(num(input.indicatorSize, d.indicatorSize), 0.6, 4),
    indicatorAngle: cl(num(input.indicatorAngle, d.indicatorAngle), 0, 360),
    indicatorDepth: Math.max(0.4, num(input.indicatorDepth, d.indicatorDepth)),
    indicatorReach: Math.max(2, num(input.indicatorReach, d.indicatorReach)),
    surfaceTexture: pick(input.surfaceTexture, ["none", "flutes"], d.surfaceTexture),
    fluteCount: cl(Math.round(num(input.fluteCount, d.fluteCount)), 8, 48),
    fluteDepth: Math.max(0.2, num(input.fluteDepth, d.fluteDepth)),
    fluteWidthPercent: cl(num(input.fluteWidthPercent, d.fluteWidthPercent), 40, 120),
  };

  // Apply the interdependent dynamic limits in dependency order.
  const minDia = minBodyDiameter(p);
  p.bodyDiameter = Math.max(minDia, p.bodyDiameter);
  p.topDiameter = Math.max(minDia, p.topDiameter);
  p.shaftHoleDepth = Math.min(p.shaftHoleDepth, maxShaftHoleDepth(p));
  p.topEdgeSize = Math.min(p.topEdgeSize, maxTopEdgeSize(p));
  p.topRecessDepth = Math.min(p.topRecessDepth, maxTopRecessDepth(p));
  p.topRimWidth = Math.min(p.topRimWidth, maxTopRimWidth(p));
  p.indicatorDepth = Math.min(p.indicatorDepth, maxIndicatorDepth(p));
  p.indicatorReach = Math.min(p.indicatorReach, maxIndicatorReach(p));
  p.fluteDepth = Math.min(p.fluteDepth, maxFluteDepth(p));
  return p;
}
