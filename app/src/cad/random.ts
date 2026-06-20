// "Surprise me" generator — a random but always-valid knob. Every field is
// sampled in a tasteful range, then clampParams() guarantees a buildable result.

import { DEFAULT_PARAMS, clampParams, type KnobParams } from "./params";

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rnd = (lo: number, hi: number, step = 1) =>
  lo + Math.round((Math.random() * (hi - lo)) / step) * step;

export function randomParams(): KnobParams {
  const dia = rnd(14, 30);
  const draft: Partial<KnobParams> = {
    shaft: pick(["EC11COMPAT", "EC12E24404A8", "EC12E1240301"]),
    // Bias toward round; the exotic shapes still show up regularly.
    bodyShape: pick(["round", "round", "round", "polygon", "lobed", "pointer"]),
    polygonSides: rnd(3, 8),
    cornerRadius: pick([0, 0, rnd(1, 3, 0.5)]),
    lobeCount: rnd(4, 10),
    lobeDepth: rnd(1, 2.5, 0.5),
    pointerLength: rnd(5, 12),
    bodyDiameter: dia,
    // Often a straight body; sometimes a gentle taper.
    topDiameter: Math.random() < 0.6 ? dia : rnd(14, 30),
    bodyHeight: rnd(10, 22),
    bodyBulge: pick([0, 0, 0, rnd(-3, 6)]),
    shaftClearance: pick([0.1, 0.15, 0.2]),
    topEdgeStyle: pick(["none", "chamfer", "fillet"]),
    topEdgeSize: rnd(0.6, 2, 0.2),
    topStyle: pick(["flat", "flat", "recess", "dish", "dome"]),
    topRecessDepth: rnd(1, 4, 0.5),
    topRimWidth: rnd(1, 3, 0.5),
    indicator: pick(["none", "line", "line", "dimple"]),
    indicatorAngle: rnd(0, 345, 15),
    indicatorReach: rnd(4, 9),
    surfaceTexture: pick(["none", "flutes", "flutes", "helical", "diamond", "rings", "scallops"]),
    fluteCount: rnd(8, 36),
    fluteDepth: rnd(0.4, 1, 0.1),
    fluteWidthPercent: rnd(60, 110, 5),
    knurlAngle: rnd(15, 30),
    tickRing: pick(["none", "none", "none", "ticks"]),
    tickCount: rnd(8, 24),
    tickMajorEvery: pick([0, 4, 5]),
    tickSpan: pick([360, 360, 270, 300]),
    skirt: pick(["none", "none", "none", "flange"]),
    skirtDiameter: dia + rnd(6, 12),
    skirtHeight: rnd(2, 4),
  };
  return clampParams({ ...DEFAULT_PARAMS, ...draft });
}
