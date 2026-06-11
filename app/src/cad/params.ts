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
}

/** Day 2: top rim edge treatment — none, 45° chamfer, or rounded fillet. */
export type TopEdgeStyle = "none" | "chamfer" | "fillet";

/** Day 4: top face treatment — flat, cylindrical recess, or spherical dish. */
export type TopStyle = "flat" | "recess" | "dish";

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
