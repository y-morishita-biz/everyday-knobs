import { drawCircle, drawRoundedRectangle, makeCylinder } from "replicad";
import type { Solid } from "replicad";
import { SHAFTS, maxShaftHoleDepth, type KnobParams } from "./params";

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

/** Build the full knob solid for the given parameters. */
export function buildKnob(params: KnobParams): Solid {
  const body = makeCylinder(params.bodyDiameter / 2, params.bodyHeight);
  const depth = Math.min(params.shaftHoleDepth, maxShaftHoleDepth(params));
  const socket = buildShaftSocket(params, depth);
  return body.cut(socket);
}
