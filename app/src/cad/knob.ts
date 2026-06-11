import {
  drawCircle,
  drawRoundedRectangle,
  makeBaseBox,
  makeCylinder,
  makeSphere,
} from "replicad";
import type { Sketch, Solid } from "replicad";
import {
  INDICATOR_DEPTH,
  SHAFTS,
  flatTopRadius,
  maxFluteDepth,
  maxShaftHoleDepth,
  maxTopEdgeSize,
  maxTopRecessDepth,
  type KnobParams,
} from "./params";

/**
 * Build the shaft socket as a 2D profile on the XY plane, then extrude it.
 * Round shaft -> a circle. D-cut shaft -> a circle with one side flattened.
 */
function buildShaftSocket(params: KnobParams, depth: number): Solid {
  const spec = SHAFTS[params.shaft];
  const holeRadius = spec.outerDiameter / 2 + params.shaftClearance;

  let profile = drawCircle(holeRadius);

  if (spec.flatDistance !== undefined) {
    // Flat face sits `flatDistance` from the axis (clearance pushes it outward).
    const flatAt = spec.flatDistance + params.shaftClearance;
    const big = holeRadius * 4 + 10;
    // Rectangle covering the region x > flatAt; cutting it leaves a flat at x = flatAt.
    const cutter = drawRoundedRectangle(big, big).translate(flatAt + big / 2, 0);
    profile = profile.cut(cutter);
  }

  // Extrude slightly past the bottom face so the boolean cut is clean.
  return profile
    .sketchOnPlane("XY")
    .extrude(depth + 0.2)
    .translate([0, 0, -0.1]) as Solid;
}

/** Solid body: a straight cylinder, or a frustum when top and base differ. */
function buildBody(params: KnobParams): Solid {
  const baseR = params.bodyDiameter / 2;
  const topR = params.topDiameter / 2;
  if (Math.abs(baseR - topR) < 0.01) {
    return makeCylinder(baseR, params.bodyHeight) as Solid;
  }
  const base = drawCircle(baseR).sketchOnPlane("XY", 0) as Sketch;
  const top = drawCircle(topR).sketchOnPlane("XY", params.bodyHeight) as Sketch;
  return base.loftWith(top, { ruled: true }) as Solid;
}

/**
 * Apply the top rim treatment to the plain body. Done before the socket cut
 * so the edge filter only ever sees the body's own top edge.
 */
function applyTopEdge(body: Solid, params: KnobParams): Solid {
  const size = Math.min(params.topEdgeSize, maxTopEdgeSize(params));
  if (params.topEdgeStyle === "none" || size <= 0) return body;
  const topEdge = (e: import("replicad").EdgeFinder) =>
    e.inPlane("XY", params.bodyHeight);
  return params.topEdgeStyle === "chamfer"
    ? (body.chamfer(size, topEdge) as Solid)
    : (body.fillet(size, topEdge) as Solid);
}

/** Carve a cylindrical recess or a spherical dish into the top face. */
function applyTopStyle(body: Solid, params: KnobParams): Solid {
  if (params.topStyle === "flat") return body;
  const depth = Math.min(params.topRecessDepth, maxTopRecessDepth(params));
  if (depth <= 0) return body;
  const flatR = flatTopRadius(params);
  const h = params.bodyHeight;

  if (params.topStyle === "recess") {
    const recessR = Math.max(2, flatR - 1.5);
    const pocket = makeCylinder(recessR, depth + 0.1).translate([0, 0, h - depth]);
    return body.cut(pocket) as Solid;
  }

  // dish: cut a sphere sized to give radius `a` and depth `depth` at the top.
  const a = Math.max(2, flatR - 0.3);
  const rho = (a * a + depth * depth) / (2 * depth);
  const sphere = makeSphere(rho).translate([0, 0, h + (rho - depth)]);
  return body.cut(sphere) as Solid;
}

/** Engrave a radial pointer line or an offset dimple into the top face. */
function applyIndicator(body: Solid, params: KnobParams): Solid {
  if (params.indicator === "none") return body;
  const flatR = flatTopRadius(params);
  const top = params.bodyHeight;
  // Keep the engraving shallower than the wall above the socket.
  const wall = top - Math.min(params.shaftHoleDepth, maxShaftHoleDepth(params));
  const depth = Math.min(INDICATOR_DEPTH, wall - 0.4);
  if (depth <= 0) return body;

  if (params.indicator === "line") {
    const len = flatR + 1; // overshoot the rim for a clean cut
    const hz = depth + 0.2;
    const cutter = makeBaseBox(len, params.indicatorSize, hz)
      .translate([len / 2, 0, top + 0.1 - hz / 2])
      .rotate(params.indicatorAngle, [0, 0, 0], [0, 0, 1]);
    return body.cut(cutter) as Solid;
  }

  // dimple: an offset cylindrical pocket near the rim.
  const r = params.indicatorSize / 2;
  const offset = Math.max(0, flatR - r - 1.2);
  const a = (params.indicatorAngle * Math.PI) / 180;
  const dimple = makeCylinder(r, depth + 0.1, [
    Math.cos(a) * offset,
    Math.sin(a) * offset,
    top - depth,
  ]);
  return body.cut(dimple) as Solid;
}

/** Carve vertical flutes (straight knurl) into the side wall. */
function applyFlutes(body: Solid, params: KnobParams): Solid {
  if (params.surfaceTexture !== "flutes") return body;
  const depth = Math.min(params.fluteDepth, maxFluteDepth(params));
  if (depth <= 0) return body;
  const n = Math.round(params.fluteCount);

  // Leave smooth rings: above the base and below the top edge treatment.
  const edge =
    params.topEdgeStyle === "none"
      ? 0
      : Math.min(params.topEdgeSize, maxTopEdgeSize(params));
  const bottomMargin = 0.8;
  const zStart = bottomMargin;
  const bandHeight = params.bodyHeight - (edge + 0.8) - bottomMargin;
  if (bandHeight <= 1) return body;

  // Reference radius at the band's mid-height keeps the flute root wall constant.
  const baseR = params.bodyDiameter / 2;
  const topR = params.topDiameter / 2;
  const midZ = zStart + bandHeight / 2;
  const refR = baseR + (topR - baseR) * (midZ / params.bodyHeight);
  const cutR = Math.max(0.4, ((Math.PI * refR) / n) * 0.85);
  const dist = refR - depth + cutR;

  let cutters: Solid | null = null;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI;
    const c = makeCylinder(cutR, bandHeight + 0.2, [
      Math.cos(a) * dist,
      Math.sin(a) * dist,
      zStart - 0.1,
    ]) as Solid;
    cutters = cutters ? (cutters.fuse(c) as Solid) : c;
  }
  return cutters ? (body.cut(cutters) as Solid) : body;
}

/** Build the full knob solid for the given parameters. */
export function buildKnob(params: KnobParams): Solid {
  let body = buildBody(params);
  body = applyTopEdge(body, params);
  body = applyTopStyle(body, params);
  body = applyIndicator(body, params);
  body = applyFlutes(body, params);
  const depth = Math.min(params.shaftHoleDepth, maxShaftHoleDepth(params));
  const socket = buildShaftSocket(params, depth);
  return body.cut(socket);
}
