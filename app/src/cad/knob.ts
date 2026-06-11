import { drawCircle, drawRoundedRectangle, makeCylinder, makeSphere } from "replicad";
import type { Sketch, Solid } from "replicad";
import {
  SHAFTS,
  flatTopRadius,
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

/** Build the full knob solid for the given parameters. */
export function buildKnob(params: KnobParams): Solid {
  let body = buildBody(params);
  body = applyTopEdge(body, params);
  body = applyTopStyle(body, params);
  const depth = Math.min(params.shaftHoleDepth, maxShaftHoleDepth(params));
  const socket = buildShaftSocket(params, depth);
  return body.cut(socket);
}
