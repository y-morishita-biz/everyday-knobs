// Parameter model for the knob generator.
//
// Shaft specs are taken from the ALPS STEP measurements documented in
// reference/README.md. The knob's shaft socket (the negative shape cut from the
// body) is derived from these values plus an independent clearance parameter.

export type ShaftType = "EC11COMPAT" | "EC12E24404A8" | "EC12E1240301";

/**
 * Cross-section of the shaft socket (the negative cut from the knob body).
 * Generalised so richer shafts (insulated/splined, double-flat, low-profile)
 * can be added without changing the body code.
 * - round       … plain cylinder (knob caps over / fits onto a round shaft)
 * - dcut        … one flat face (ALPS φ6 D-cut metal shaft)
 * - double-flat … two opposing flats
 * - serrated    … splined / serrated insulated shaft (teeth around the bore)
 * - hollow      … annular socket: knob caps over the φ outer AND a center post
 *                 drops into the shaft's hollow bore (hollow-shaft mounting)
 */
export type SocketProfile =
  | { kind: "round" }
  | { kind: "dcut"; flatDistance: number }
  | { kind: "double-flat"; flatDistance: number }
  | { kind: "serrated"; teeth: number; toothDepth: number }
  | {
      kind: "hollow";
      boreDiameter: number;
      /**
       * Anti-rotation ribs bridging inward from the cap wall to `innerDiameter`,
       * one per entry in `angles` (degrees, 0 = +X, CCW).
       */
      ribs?: { angles: number[]; width: number; innerDiameter: number };
    };

export interface ShaftSpec {
  id: ShaftType;
  label: string;
  /** Nominal shaft outer diameter the knob fits over (mm). */
  outerDiameter: number;
  /** Socket cross-section to cut from the body. */
  socket: SocketProfile;
  /** Nominal shaft protrusion above the mounting face (mm). Informational. */
  shaftProtrusion?: number;
  /** Body boss the knob skirt must clear / cap over (mm). Informational. */
  bossDiameter?: number;
  bossHeight?: number;
  /** Suggested default socket depth for this shaft (mm). */
  recommendedHoleDepth?: number;
  /** Locks the socket depth to a fixed value (mm) — the depth slider is hidden. */
  fixedHoleDepth?: number;
  /** Dimensions not yet confirmed from the manufacturer STEP (placeholder). */
  provisional?: boolean;
}

export const SHAFTS: Record<ShaftType, ShaftSpec> = {
  // EC11-series-compatible straight knurled (serrated) φ6 shaft. The knob presses
  // onto the serration for grip / anti-rotation. Modelled as a φ6 fine knurl;
  // tooth pitch is adjustable from the printed fit test.
  EC11COMPAT: {
    id: "EC11COMPAT",
    label: "EC11シリーズ互換 (φ6 ストレート・ローレット軸)",
    outerDiameter: 6.0,
    socket: { kind: "serrated", teeth: 20, toothDepth: 0.5 },
    shaftProtrusion: 15,
    recommendedHoleDepth: 12,
  },
  // EC12E24404A8 — 12mm insulated shaft, D-cut (one flat), standard height.
  // From EC12E-200.STEP (mm): φ6 shaft, ~17mm protrusion. Flat ≈1.5mm from axis
  // (AF 4.5, the φ6 D-cut standard) — verify against the part / fit test.
  EC12E24404A8: {
    id: "EC12E24404A8",
    label: "EC12E24404A8 (12型 絶縁軸・Dカット)",
    outerDiameter: 6.0,
    socket: { kind: "dcut", flatDistance: 1.5 },
    shaftProtrusion: 17,
    recommendedHoleDepth: 12,
  },
  // EC12E1240301 — EC12E insulated hollow shaft, low-profile. From EC12E-085.step,
  // the outline drawing, and the supplied reference knobs (low_knob_a/b): the knob
  // caps over the φ6 outer AND a center post drops into the φ3.1 bore for
  // centering/retention — a "cap + center post" mount. (Anti-rotation ribs seen in
  // the reference are not modelled yet.)
  EC12E1240301: {
    id: "EC12E1240301",
    label: "EC12E1240301 (絶縁中空軸・低背)",
    outerDiameter: 6.05,
    socket: {
      kind: "hollow",
      boreDiameter: 3.1,
      // Anti-rotation keys measured from the reference knob (low_knob_a/b):
      // two ribs in the upper half (≈52° & 128°, symmetric about +Y — an
      // orientation key), reaching inward to ~φ4.1, ~1.0mm wide.
      ribs: { angles: [52, 128], width: 1.0, innerDiameter: 4.1 },
    },
    shaftProtrusion: 6.2,
    bossDiameter: 10,
    bossHeight: 2,
    recommendedHoleDepth: 2.55,
    // The mount depth is fixed by the reference knob (socket Z 0.90–3.45).
    fixedHoleDepth: 2.55,
  },
};

/** Flat-face distance for D-cut style sockets (mm), else undefined. */
export function socketFlatDistance(spec: ShaftSpec): number | undefined {
  return spec.socket.kind === "dcut" || spec.socket.kind === "double-flat"
    ? spec.socket.flatDistance
    : undefined;
}

export interface KnobParams {
  shaft: ShaftType;
  /** Cross-section of the body. */
  bodyShape: BodyShape;
  /** Number of sides when bodyShape is polygon (3–8). */
  polygonSides: number;
  /** Corner rounding radius for a polygon body (mm). */
  cornerRadius: number;
  /** Number of lobes when bodyShape is lobed (3–12). */
  lobeCount: number;
  /** Lobe amplitude — how far peaks/valleys deviate from the mean radius (mm). */
  lobeDepth: number;
  /** Beak length beyond the round part when bodyShape is pointer (chicken-head), mm. */
  pointerLength: number;
  /** Outer diameter at the base (bottom) of the body (mm). For polygon = circumscribed. */
  bodyDiameter: number;
  /** Outer diameter at the top of the body (mm). Equal to bodyDiameter = straight cylinder. */
  topDiameter: number;
  /** Total height of the body (mm). */
  bodyHeight: number;
  /** Side-profile bulge at mid-height (mm, round body only): + barrel, − waist. */
  bodyBulge: number;
  /** Radial clearance added to the shaft socket for fit (mm). Negative = press fit. */
  shaftClearance: number;
  /** Depth of the shaft socket measured from the bottom face (mm). */
  shaftHoleDepth: number;
  /** Chamfer on the bottom outer edge — elephant-foot compensation (mm, 0 = off). */
  bottomChamfer: number;
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
  /** Scale tick ring engraved around the top rim. */
  tickRing: TickRing;
  /** Number of ticks around the ring (or across the arc). */
  tickCount: number;
  /** Every Nth tick is a long "major" tick (0 = all ticks equal). */
  tickMajorEvery: number;
  /** Angular span of the tick scale (degrees, 360 = full ring). */
  tickSpan: number;
  /** Side-wall texture. */
  surfaceTexture: SurfaceTexture;
  /** Number of vertical flutes around the side. */
  fluteCount: number;
  /** Radial depth each flute bites into the side (mm). */
  fluteDepth: number;
  /** Flute cutter size as a percentage of the angular pitch (40–120). */
  fluteWidthPercent: number;
  /** Helix angle for helical / diamond knurl (degrees from vertical). */
  knurlAngle: number;
  /** Base flange / skirt. */
  skirt: SkirtStyle;
  /** Outer diameter of the base skirt (mm). */
  skirtDiameter: number;
  /** Height of the base skirt (mm). */
  skirtHeight: number;
}

/** Day 2: top rim edge treatment — none, 45° chamfer, or rounded fillet. */
export type TopEdgeStyle = "none" | "chamfer" | "fillet";

/** Day 4/20: top face — flat, recess (pocket), dish (concave), or dome (convex crown). */
export type TopStyle = "flat" | "recess" | "dish" | "dome";

/** Day 5: top-face indicator — none, an engraved radial line, or an offset dimple. */
export type IndicatorType = "none" | "line" | "dimple";

/** Day 15: scale tick ring on the top rim — none or engraved ticks. */
export type TickRing = "none" | "ticks";

/**
 * Side-wall texture.
 * Day 6: none / flutes (vertical). Day 10: helical / diamond. Day 19: rings
 * (horizontal grooves) / scallops (finger scoops).
 */
export type SurfaceTexture =
  | "none"
  | "flutes"
  | "helical"
  | "diamond"
  | "rings"
  | "scallops";

/** Day 9: base flange — none or a wider skirt at the bottom. */
export type SkirtStyle = "none" | "flange";

/** Day 11/17/18: body cross-section — round, polygon, lobed, or pointer (chicken-head). */
export type BodyShape = "round" | "polygon" | "lobed" | "pointer";

export const DEFAULT_PARAMS: KnobParams = {
  shaft: "EC11COMPAT",
  bodyShape: "round",
  polygonSides: 6,
  cornerRadius: 1,
  lobeCount: 6,
  lobeDepth: 1.5,
  pointerLength: 7,
  bodyDiameter: 20,
  topDiameter: 20,
  bodyHeight: 16,
  bodyBulge: 0,
  shaftClearance: 0.15,
  shaftHoleDepth: 12,
  bottomChamfer: 0,
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
  tickRing: "none",
  tickCount: 12,
  tickMajorEvery: 0,
  tickSpan: 360,
  surfaceTexture: "none",
  fluteCount: 24,
  fluteDepth: 0.6,
  fluteWidthPercent: 85,
  knurlAngle: 30,
  skirt: "none",
  skirtDiameter: 26,
  skirtHeight: 3,
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

/** Inscribed-radius factor for a polygon body (1 for round/lobed). */
function inradiusFactor(params: KnobParams): number {
  return params.bodyShape === "polygon" ? Math.cos(Math.PI / params.polygonSides) : 1;
}

/**
 * The limiting *inner* radius of a body section (mm): the closest the outer
 * surface gets to the axis. Polygon = inscribed radius (face center); lobed =
 * valley radius (mean − lobe depth); round = the radius itself. Drives top
 * features and socket clearance.
 */
export function bodyOuterRadius(diameter: number, params: KnobParams): number {
  if (params.bodyShape === "lobed") return diameter / 2 - params.lobeDepth;
  return (diameter / 2) * inradiusFactor(params);
}

/** Smallest body diameter that still leaves MIN_WALL around the socket (mm). */
export function minBodyDiameter(params: KnobParams): number {
  const needed = shaftSocketRadius(params) + MIN_WALL; // required inner radius
  if (params.bodyShape === "lobed") return Math.ceil((needed + params.lobeDepth) * 2);
  return Math.ceil((needed / inradiusFactor(params)) * 2);
}

/** Largest lobe depth (amplitude) that keeps the valley clear of the socket (mm). */
export function maxLobeDepth(params: KnobParams): number {
  const meanR = Math.min(params.bodyDiameter, params.topDiameter) / 2;
  const room = meanR - shaftSocketRadius(params) - MIN_WALL;
  return Math.max(0.3, Math.min(meanR * 0.45, Math.floor(room * 10) / 10));
}

/** Largest corner-rounding radius for the current polygon size (mm). */
export function maxCornerRadius(params: KnobParams): number {
  if (params.bodyShape !== "polygon") return 0;
  const rc = Math.min(params.bodyDiameter, params.topDiameter) / 2;
  const side = 2 * rc * Math.sin(Math.PI / params.polygonSides);
  return Math.max(0, Math.floor(Math.min(side * 0.45, rc * 0.5) * 10) / 10);
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
  const radial = bodyOuterRadius(params.topDiameter, params) - shaftSocketRadius(params) - 0.2;
  const vertical = params.bodyHeight * 0.45;
  return Math.max(0, Math.floor(Math.min(radial, vertical) * 10) / 10);
}

/** Radius of the flat top face that remains after the rim edge treatment (mm). */
export function flatTopRadius(params: KnobParams): number {
  const edge =
    params.topEdgeStyle === "none"
      ? 0
      : Math.min(params.topEdgeSize, maxTopEdgeSize(params));
  return bodyOuterRadius(params.topDiameter, params) - edge;
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

/** Tallest convex dome (additive crown) for the current top radius (mm). */
export function maxDomeHeight(params: KnobParams): number {
  return Math.max(0.4, Math.min(8, Math.floor(flatTopRadius(params) * 0.9 * 10) / 10));
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
 * Allowed range for the side-profile bulge (mm). Waist (negative) is bounded so
 * the narrowest point keeps MIN_WALL+0.5 around the socket; barrel (positive)
 * is capped for sane proportions. Round bodies only.
 */
export function bulgeRange(params: KnobParams): [number, number] {
  const midR = midBodyRadius(params);
  const minR = shaftSocketRadius(params) + MIN_WALL + 0.5;
  const min = -Math.max(0, midR - minR);
  const max = Math.min(10, midR * 0.8);
  return [Math.ceil(min * 2) / 2, Math.floor(max * 2) / 2];
}

/**
 * Deepest a flute can bite while keeping a wall of at least 1.0mm between the
 * flute root and the shaft socket (mm), capped for sane proportions.
 */
export function maxFluteDepth(params: KnobParams): number {
  // A waist (negative bulge) narrows the mid radius — account for it.
  const waist = params.bodyShape === "round" ? Math.min(0, params.bodyBulge) : 0;
  const room = midBodyRadius(params) + waist - shaftSocketRadius(params) - 1.0;
  return Math.max(0, Math.min(1.5, Math.floor(room * 10) / 10));
}

/** Smallest skirt diameter that is still a flange (≥ the body base) (mm). */
export function minSkirtDiameter(params: KnobParams): number {
  return Math.ceil(params.bodyDiameter);
}

/** Tallest skirt that still leaves body above it (mm). */
export function maxSkirtHeight(params: KnobParams): number {
  return Math.max(1, Math.floor((params.bodyHeight - 2) * 10) / 10);
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
    shaft: pick(input.shaft, ["EC11COMPAT", "EC12E24404A8", "EC12E1240301"], d.shaft),
    bodyShape: pick(input.bodyShape, ["round", "polygon", "lobed", "pointer"], d.bodyShape),
    polygonSides: cl(Math.round(num(input.polygonSides, d.polygonSides)), 3, 8),
    cornerRadius: Math.max(0, num(input.cornerRadius, d.cornerRadius)),
    lobeCount: cl(Math.round(num(input.lobeCount, d.lobeCount)), 3, 12),
    lobeDepth: Math.max(0.3, num(input.lobeDepth, d.lobeDepth)),
    pointerLength: cl(num(input.pointerLength, d.pointerLength), 1, 30),
    bodyHeight: cl(num(input.bodyHeight, d.bodyHeight), 4, 40),
    bodyBulge: num(input.bodyBulge, d.bodyBulge),
    bodyDiameter: cl(num(input.bodyDiameter, d.bodyDiameter), 6, 60),
    topDiameter: cl(num(input.topDiameter, d.topDiameter), 6, 60),
    shaftClearance: cl(num(input.shaftClearance, d.shaftClearance), -0.1, 0.6),
    bottomChamfer: cl(num(input.bottomChamfer, d.bottomChamfer), 0, 0.6),
    shaftHoleDepth: cl(num(input.shaftHoleDepth, d.shaftHoleDepth), 2, 40),
    topEdgeStyle: pick(input.topEdgeStyle, ["none", "chamfer", "fillet"], d.topEdgeStyle),
    topEdgeSize: Math.max(0.2, num(input.topEdgeSize, d.topEdgeSize)),
    topStyle: pick(input.topStyle, ["flat", "recess", "dish", "dome"], d.topStyle),
    topRecessDepth: Math.max(0.4, num(input.topRecessDepth, d.topRecessDepth)),
    topRimWidth: Math.max(0.5, num(input.topRimWidth, d.topRimWidth)),
    indicator: pick(input.indicator, ["none", "line", "dimple"], d.indicator),
    indicatorSize: cl(num(input.indicatorSize, d.indicatorSize), 0.6, 4),
    indicatorAngle: cl(num(input.indicatorAngle, d.indicatorAngle), 0, 360),
    indicatorDepth: Math.max(0.4, num(input.indicatorDepth, d.indicatorDepth)),
    indicatorReach: Math.max(2, num(input.indicatorReach, d.indicatorReach)),
    tickRing: pick(input.tickRing, ["none", "ticks"], d.tickRing),
    tickCount: cl(Math.round(num(input.tickCount, d.tickCount)), 4, 60),
    tickMajorEvery: cl(Math.round(num(input.tickMajorEvery, d.tickMajorEvery)), 0, 12),
    tickSpan: cl(num(input.tickSpan, d.tickSpan), 60, 360),
    surfaceTexture: pick(
      input.surfaceTexture,
      ["none", "flutes", "helical", "diamond", "rings", "scallops"],
      d.surfaceTexture,
    ),
    fluteCount: cl(Math.round(num(input.fluteCount, d.fluteCount)), 3, 48),
    fluteDepth: Math.max(0.2, num(input.fluteDepth, d.fluteDepth)),
    fluteWidthPercent: cl(num(input.fluteWidthPercent, d.fluteWidthPercent), 40, 120),
    knurlAngle: cl(num(input.knurlAngle, d.knurlAngle), 10, 30),
    skirt: pick(input.skirt, ["none", "flange"], d.skirt),
    skirtDiameter: cl(num(input.skirtDiameter, d.skirtDiameter), 6, 70),
    skirtHeight: cl(num(input.skirtHeight, d.skirtHeight), 1, 40),
  };

  // Apply the interdependent dynamic limits in dependency order.
  if (p.bodyShape === "lobed") p.lobeDepth = Math.min(p.lobeDepth, maxLobeDepth(p));
  const minDia = minBodyDiameter(p);
  p.bodyDiameter = Math.max(minDia, p.bodyDiameter);
  p.topDiameter = Math.max(minDia, p.topDiameter);
  const fixedDepth = SHAFTS[p.shaft].fixedHoleDepth;
  p.shaftHoleDepth = Math.min(
    fixedDepth ?? p.shaftHoleDepth,
    maxShaftHoleDepth(p),
  );
  p.topEdgeSize = Math.min(p.topEdgeSize, maxTopEdgeSize(p));
  p.topRecessDepth = Math.min(
    p.topRecessDepth,
    p.topStyle === "dome" ? maxDomeHeight(p) : maxTopRecessDepth(p),
  );
  p.topRimWidth = Math.min(p.topRimWidth, maxTopRimWidth(p));
  p.indicatorDepth = Math.min(p.indicatorDepth, maxIndicatorDepth(p));
  p.indicatorReach = Math.min(p.indicatorReach, maxIndicatorReach(p));
  p.fluteDepth = Math.min(p.fluteDepth, maxFluteDepth(p));
  p.skirtDiameter = Math.max(minSkirtDiameter(p), p.skirtDiameter);
  p.skirtHeight = Math.min(p.skirtHeight, maxSkirtHeight(p));
  p.cornerRadius = Math.min(p.cornerRadius, maxCornerRadius(p));
  // Bulge applies to round bodies only; clamp to its safe range.
  if (p.bodyShape !== "round") {
    p.bodyBulge = 0;
  } else {
    const [lo, hi] = bulgeRange(p);
    p.bodyBulge = Math.min(hi, Math.max(lo, p.bodyBulge));
  }
  return p;
}
