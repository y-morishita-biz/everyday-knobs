import {
  draw,
  drawCircle,
  drawRoundedRectangle,
  makeBaseBox,
  makeCylinder,
  makeSphere,
} from "replicad";
import type { Drawing, Sketch, Solid } from "replicad";
import {
  SHAFTS,
  flatTopRadius,
  maxCornerRadius,
  maxDomeHeight,
  maxFluteDepth,
  maxIndicatorDepth,
  maxIndicatorReach,
  maxShaftHoleDepth,
  maxSkirtHeight,
  maxTopEdgeSize,
  maxTopRecessDepth,
  maxTopRimWidth,
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

/**
 * Truncated cone cut at a socket opening: a 0.5mm lead-in chamfer that makes
 * the shaft easy to start and shrugs off first-layer squish around the hole.
 * `faceUp` selects which way the wide end points (true = opening faces +Z).
 */
function socketLeadIn(params: KnobParams, cx: number, zBase: number, faceUp: boolean): Solid {
  const r = SHAFTS[params.shaft].outerDiameter / 2 + params.shaftClearance;
  const flare = 0.45;
  const h = 0.5;
  const wide = drawCircle(r + flare)
    .translate(cx, 0)
    .sketchOnPlane("XY", faceUp ? zBase + 0.05 : zBase - 0.05) as Sketch;
  const narrow = drawCircle(r)
    .translate(cx, 0)
    .sketchOnPlane("XY", faceUp ? zBase - h : zBase + h) as Sketch;
  return wide.loftWith(narrow, { ruled: true }) as Solid;
}

/**
 * Whether the body's top/bottom rim is a tangent line+arc chain (rounded
 * polygon or lobed) that OCCT cannot reliably chamfer or fillet.
 */
function hasComplexRim(params: KnobParams): boolean {
  if (params.bodyShape === "lobed" || params.bodyShape === "pointer") return true;
  return (
    params.bodyShape === "polygon" &&
    Math.min(params.cornerRadius, maxCornerRadius(params)) > 0.05
  );
}

/** A regular polygon drawing with optional rounded corners, circumradius `rc`. */
function polygonDrawing(rc: number, params: KnobParams): Drawing {
  const n = params.polygonSides;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * 2 * Math.PI;
    pts.push([Math.cos(a) * rc, Math.sin(a) * rc]);
  }
  let pen = draw(pts[0]);
  for (let i = 1; i < n; i++) pen = pen.lineTo(pts[i]);
  let d = pen.close();
  const cr = Math.min(params.cornerRadius, maxCornerRadius(params));
  if (cr > 0.05) d = d.fillet(cr);
  return d;
}

/** A lobed (wavy) closed drawing: radius modulated by cos(lobes·θ), mean `meanR`. */
function lobedDrawing(meanR: number, params: KnobParams): Drawing {
  const n = params.lobeCount;
  const amp = Math.min(params.lobeDepth, meanR - 0.5);
  const steps = Math.max(96, n * 16);
  let pen: ReturnType<typeof draw> | null = null;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    const r = meanR + amp * Math.cos(n * a);
    const pt: [number, number] = [Math.cos(a) * r, Math.sin(a) * r];
    pen = pen ? pen.lineTo(pt) : draw(pt);
  }
  return pen!.close();
}

/**
 * Teardrop "chicken-head" drawing: a circle of radius `rr` with a beak that
 * extends `pointerLength` beyond it, the whole shape rotated so the beak points
 * along `indicatorAngle`.
 */
function teardropDrawing(rr: number, params: KnobParams): Drawing {
  const dApex = rr + Math.max(1, params.pointerLength);
  const beta = Math.acos(Math.min(0.999, rr / dApex)); // tangent-point angle
  const ang = (params.indicatorAngle * Math.PI) / 180;
  const rot = (x: number, y: number): [number, number] => [
    x * Math.cos(ang) - y * Math.sin(ang),
    x * Math.sin(ang) + y * Math.cos(ang),
  ];
  const tPlus = rot(rr * Math.cos(beta), rr * Math.sin(beta));
  const tMinus = rot(rr * Math.cos(beta), -rr * Math.sin(beta));
  const back = rot(-rr, 0);
  const apex = rot(dApex, 0);
  return draw(tPlus).threePointsArcTo(tMinus, back).lineTo(apex).close();
}

/** Cross-section drawing (circle, polygon, lobed, or pointer) at a diameter. */
function sectionDrawing(diameter: number, params: KnobParams): Drawing {
  if (params.bodyShape === "polygon") return polygonDrawing(diameter / 2, params);
  if (params.bodyShape === "lobed") return lobedDrawing(diameter / 2, params);
  if (params.bodyShape === "pointer") return teardropDrawing(diameter / 2, params);
  return drawCircle(diameter / 2);
}

/**
 * Curved round body via revolving a side profile: base → arc through the
 * mid-height point (offset by `bulge`) → top, closed along the axis. Positive
 * bulge gives a barrel, negative a waist.
 */
function buildRevolvedBody(params: KnobParams): Solid {
  const baseR = params.bodyDiameter / 2;
  const topR = params.topDiameter / 2;
  const H = params.bodyHeight;
  const mid = (baseR + topR) / 2 + params.bodyBulge;
  const profile = draw([0, 0])
    .lineTo([baseR, 0])
    .threePointsArcTo([topR, H], [mid, H / 2])
    .lineTo([0, H])
    .close();
  return profile.sketchOnPlane("XZ").revolve([0, 0, 1]) as Solid;
}

/** Solid body: round or polygon, straight, tapered, or curved (barrel/waist). */
function buildBody(params: KnobParams): Solid {
  const baseR = params.bodyDiameter / 2;
  const topR = params.topDiameter / 2;
  const straight = Math.abs(baseR - topR) < 0.01;

  if (params.bodyShape === "round" && Math.abs(params.bodyBulge) > 0.05) {
    return buildRevolvedBody(params);
  }
  if (params.bodyShape === "round" && straight) {
    return makeCylinder(baseR, params.bodyHeight) as Solid;
  }
  if (straight) {
    return sectionDrawing(params.bodyDiameter, params)
      .sketchOnPlane("XY")
      .extrude(params.bodyHeight) as Solid;
  }
  const base = sectionDrawing(params.bodyDiameter, params).sketchOnPlane("XY", 0) as Sketch;
  const top = sectionDrawing(params.topDiameter, params).sketchOnPlane(
    "XY",
    params.bodyHeight,
  ) as Sketch;
  return base.loftWith(top, { ruled: true }) as Solid;
}

/**
 * Apply the top rim treatment to the plain body. Done before the socket cut
 * so the edge filter only ever sees the body's own top edge.
 */
function applyTopEdge(body: Solid, params: KnobParams): Solid {
  const size = Math.min(params.topEdgeSize, maxTopEdgeSize(params));
  if (params.topEdgeStyle === "none" || size <= 0) return body;
  // Rounded-polygon and lobed top rims are tangent line/arc chains OCCT cannot
  // reliably chamfer/fillet; skip the rim treatment there.
  if (hasComplexRim(params)) return body;
  const topEdge = (e: import("replicad").EdgeFinder) =>
    e.inPlane("XY", params.bodyHeight);
  return params.topEdgeStyle === "chamfer"
    ? (body.chamfer(size, topEdge) as Solid)
    : (body.fillet(size, topEdge) as Solid);
}

/**
 * Height of the top surface at radius `r`. Flat/recess/dish stay at the body
 * height; a dome bulges up to its apex at the centre. Used so the indicator and
 * ticks engrave the actual (possibly curved) top surface.
 */
function topSurfaceZ(params: KnobParams, r: number): number {
  const top = params.bodyHeight;
  if (params.topStyle !== "dome") return top;
  const hh = Math.min(params.topRecessDepth, maxDomeHeight(params));
  if (hh <= 0.05) return top;
  const capR = flatTopRadius(params);
  const rho = (capR * capR + hh * hh) / (2 * hh);
  const cz = top + hh - rho;
  const rr = Math.min(Math.abs(r), capR);
  return cz + Math.sqrt(Math.max(0, rho * rho - rr * rr));
}

/** Carve a recess/dish into, or fuse a convex dome onto, the top face. */
function applyTopStyle(body: Solid, params: KnobParams): Solid {
  if (params.topStyle === "flat") return body;
  const flatR = flatTopRadius(params);
  const h = params.bodyHeight;

  if (params.topStyle === "dome") {
    const domeH = Math.min(params.topRecessDepth, maxDomeHeight(params));
    if (domeH <= 0.05) return body;
    const rho = (flatR * flatR + domeH * domeH) / (2 * domeH);
    const sphere = makeSphere(rho).translate([0, 0, h + domeH - rho]);
    const cap = sphere.intersect(
      makeCylinder(flatR, domeH + 2).translate([0, 0, h]),
    ) as Solid;
    return body.fuse(cap) as Solid;
  }

  const depth = Math.min(params.topRecessDepth, maxTopRecessDepth(params));
  if (depth <= 0) return body;
  const rim = Math.min(params.topRimWidth, maxTopRimWidth(params));

  if (params.topStyle === "recess") {
    const recessR = Math.max(2, flatR - rim);
    const pocket = makeCylinder(recessR, depth + 0.1).translate([0, 0, h - depth]);
    return body.cut(pocket) as Solid;
  }

  // dish: cut a sphere sized to give radius `a` and depth `depth` at the top.
  const a = Math.max(2, flatR - rim);
  const rho = (a * a + depth * depth) / (2 * depth);
  const sphere = makeSphere(rho).translate([0, 0, h + (rho - depth)]);
  return body.cut(sphere) as Solid;
}

/** Engrave a radial pointer line or an offset dimple into the top face. */
function applyIndicator(body: Solid, params: KnobParams): Solid {
  if (params.indicator === "none") return body;
  const flatR = flatTopRadius(params);
  const top = params.bodyHeight;
  const depth = Math.min(params.indicatorDepth, maxIndicatorDepth(params));
  const reach = Math.min(params.indicatorReach, maxIndicatorReach(params));
  if (depth <= 0) return body;

  const dome = params.topStyle === "dome";
  const apexZ = topSurfaceZ(params, 0);

  if (params.indicator === "line") {
    // Overshoot the rim only when the line is meant to reach it.
    const len = reach >= flatR - 0.3 ? flatR + 1 : reach;
    // On a dome, cut a slot from the apex down so the whole radial line shows.
    const zTop = dome ? apexZ : top;
    const hz = dome ? apexZ - top + depth + 0.3 : depth + 0.2;
    const cutter = makeBaseBox(len, params.indicatorSize, hz)
      .translate([len / 2, 0, zTop + 0.1 - hz / 2])
      .rotate(params.indicatorAngle, [0, 0, 0], [0, 0, 1]);
    return body.cut(cutter) as Solid;
  }

  // dimple: an offset cylindrical pocket on the (possibly domed) top surface.
  const r = params.indicatorSize / 2;
  const offset = Math.max(0, reach);
  const a = (params.indicatorAngle * Math.PI) / 180;
  const surfZ = topSurfaceZ(params, offset);
  const dimple = makeCylinder(r, depth + 0.1, [
    Math.cos(a) * offset,
    Math.sin(a) * offset,
    surfZ - depth,
  ]);
  return body.cut(dimple) as Solid;
}

/**
 * Engrave a ring of scale ticks just inside the top rim. A full span (360°) is
 * a closed ring; a smaller span is an arc centred at the top (12 o'clock) with
 * the gap at the bottom, like a potentiometer dial. Every `tickMajorEvery`-th
 * tick is drawn longer and wider.
 */
function applyTicks(body: Solid, params: KnobParams): Solid {
  if (params.tickRing === "none") return body;
  const flatR = flatTopRadius(params);
  if (flatR < 3.5) return body;
  const n = Math.round(params.tickCount);
  if (n < 2) return body;

  const depth = Math.min(0.4, maxIndicatorDepth(params));
  if (depth <= 0) return body;
  const hz = depth + 0.2;

  const outerR = flatR - 0.3;
  // Engrave from the actual top surface at the ring radius (matters for a dome).
  const top = topSurfaceZ(params, outerR);
  const minorLen = Math.max(0.8, Math.min(2.5, flatR * 0.2));
  const minorW = 0.6;
  const major = params.tickMajorEvery;

  const full = params.tickSpan >= 359.5;
  const span = (Math.min(360, Math.max(60, params.tickSpan)) * Math.PI) / 180;
  // Full ring: n evenly spaced. Arc: n ticks inclusive of both ends, centred up.
  const step = full ? (2 * Math.PI) / n : span / (n - 1);
  const start = full ? Math.PI / 2 : Math.PI / 2 + span / 2;

  let cutters: Solid | null = null;
  for (let i = 0; i < n; i++) {
    const isMajor = major > 0 && i % major === 0;
    const len = isMajor ? Math.min(flatR - 0.5, minorLen * 1.7) : minorLen;
    const w = isMajor ? minorW * 1.5 : minorW;
    const angleDeg = ((start - i * step) * 180) / Math.PI;
    const box = makeBaseBox(len, w, hz)
      .translate([outerR - len / 2, 0, top + 0.1 - hz / 2])
      .rotate(angleDeg, [0, 0, 0], [0, 0, 1]) as Solid;
    cutters = cutters ? (cutters.fuse(box) as Solid) : box;
  }
  return cutters ? (body.cut(cutters) as Solid) : body;
}

/** Outer surface radius of the body at height z (follows taper/bulge/lobe peak). */
function surfaceRadiusAt(params: KnobParams, z: number): number {
  const baseR = params.bodyDiameter / 2;
  const topR = params.topDiameter / 2;
  const H = params.bodyHeight;
  let r = baseR + (topR - baseR) * (z / H);
  if (params.bodyShape === "round" && Math.abs(params.bodyBulge) > 0.05) {
    r += params.bodyBulge * (1 - Math.pow((z - H / 2) / (H / 2), 2));
  } else if (params.bodyShape === "lobed") {
    r += params.lobeDepth; // peak radius
  }
  return r;
}

/** Shared side-texture band: smooth rings above the skirt and below the top edge. */
function textureBand(params: KnobParams): { zStart: number; bandHeight: number; depth: number } | null {
  const depth = Math.min(params.fluteDepth, maxFluteDepth(params));
  if (depth <= 0) return null;
  const edge =
    params.topEdgeStyle === "none"
      ? 0
      : Math.min(params.topEdgeSize, maxTopEdgeSize(params));
  const skirtTop =
    params.skirt === "flange" ? Math.min(params.skirtHeight, maxSkirtHeight(params)) : 0;
  const zStart = Math.max(0.8, skirtTop + 0.4);
  const bandHeight = params.bodyHeight - (edge + 0.8) - zStart;
  if (bandHeight <= 1) return null;
  return { zStart, bandHeight, depth };
}

/** Horizontal ring grooves: a stack of revolved tori carved around the side. */
function applyRings(body: Solid, params: KnobParams): Solid {
  const band = textureBand(params);
  if (!band) return body;
  const n = Math.round(params.fluteCount);
  if (n < 1) return body;
  const mr = Math.min(band.depth, (band.bandHeight / (2 * n)) * 0.85);
  if (mr < 0.15) return body;

  // Stack all ring cross-sections into one XZ profile, revolve once, cut once —
  // far cheaper than fusing or sequentially cutting N separate tori.
  let profile: Drawing | null = null;
  for (let i = 0; i < n; i++) {
    const z = band.zStart + ((i + 0.5) / n) * band.bandHeight;
    const circ = drawCircle(mr).translate(surfaceRadiusAt(params, z), z);
    profile = profile ? (profile.fuse(circ) as Drawing) : circ;
  }
  if (!profile) return body;
  const tool = profile.sketchOnPlane("XZ").revolve([0, 0, 1]) as Solid;
  return body.cut(tool) as Solid;
}

/** Finger scallops: a few large vertical cylindrical scoops around the side. */
function applyScallops(body: Solid, params: KnobParams): Solid {
  const band = textureBand(params);
  if (!band) return body;
  const n = Math.round(params.fluteCount);
  if (n < 2) return body;
  const midZ = band.zStart + band.bandHeight / 2;
  const refR = surfaceRadiusAt(params, midZ);
  const scoopR = Math.max(3, ((Math.PI * refR) / n) * 1.1);
  const dist = refR - band.depth + scoopR;

  let cutters: Solid | null = null;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI;
    const c = makeCylinder(scoopR, band.bandHeight + 0.2, [
      Math.cos(a) * dist,
      Math.sin(a) * dist,
      band.zStart - 0.1,
    ]) as Solid;
    cutters = cutters ? (cutters.fuse(c) as Solid) : c;
  }
  return cutters ? (body.cut(cutters) as Solid) : body;
}

/**
 * Carve a knurl into the side wall: vertical flutes, diagonal (helical), or a
 * diamond cross-hatch. Each groove is a round cutter cylinder; helical/diamond
 * tilt the cylinders circumferentially by the helix angle.
 */
function applyTexture(body: Solid, params: KnobParams): Solid {
  if (params.surfaceTexture === "none") return body;
  if (params.surfaceTexture === "rings") return applyRings(body, params);
  if (params.surfaceTexture === "scallops") return applyScallops(body, params);
  const depth = Math.min(params.fluteDepth, maxFluteDepth(params));
  if (depth <= 0) return body;
  const n = Math.round(params.fluteCount);

  // Leave smooth rings: above the skirt and below the top edge treatment.
  const edge =
    params.topEdgeStyle === "none"
      ? 0
      : Math.min(params.topEdgeSize, maxTopEdgeSize(params));
  const skirtTop =
    params.skirt === "flange" ? Math.min(params.skirtHeight, maxSkirtHeight(params)) : 0;
  const zStart = Math.max(0.8, skirtTop + 0.4);
  const bandHeight = params.bodyHeight - (edge + 0.8) - zStart;
  if (bandHeight <= 1) return body;

  // Reference radius at the band's mid-height keeps the groove root wall constant.
  const baseR = params.bodyDiameter / 2;
  const topR = params.topDiameter / 2;
  const H = params.bodyHeight;
  const midZ = zStart + bandHeight / 2;
  // Follow the curved (barrel/waist) surface so cutters reach it at mid-band.
  const bulgeAt =
    params.bodyShape === "round" && Math.abs(params.bodyBulge) > 0.05
      ? params.bodyBulge * (1 - Math.pow((midZ - H / 2) / (H / 2), 2))
      : 0;
  const refR = baseR + (topR - baseR) * (midZ / H) + bulgeAt;
  const widthRatio = Math.min(1.2, Math.max(0.4, params.fluteWidthPercent / 100));
  const cutR = Math.max(0.3, ((Math.PI * refR) / n) * widthRatio);
  const dist = refR - depth + cutR;

  // One set of grooves tilted by `sign * angle` from vertical.
  const theta = params.surfaceTexture === "flutes" ? 0 : (params.knurlAngle * Math.PI) / 180;
  const len = bandHeight / Math.cos(theta) + 0.4;
  const buildSet = (sign: number): Solid => {
    let set: Solid | null = null;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * Math.PI;
      const cx = Math.cos(a) * dist;
      const cy = Math.sin(a) * dist;
      // Axis tilts circumferentially (tangent dir) so cut depth stays constant.
      const dir: [number, number, number] = [
        sign * Math.sin(theta) * -Math.sin(a),
        sign * Math.sin(theta) * Math.cos(a),
        Math.cos(theta),
      ];
      const baseP: [number, number, number] = [
        cx - (dir[0] * len) / 2,
        cy - (dir[1] * len) / 2,
        midZ - (dir[2] * len) / 2,
      ];
      const c = makeCylinder(cutR, len, baseP, dir) as Solid;
      set = set ? (set.fuse(c) as Solid) : c;
    }
    return set as Solid;
  };

  // Cut each groove family separately. For diamond this avoids fusing the two
  // crossing families together (a much more expensive boolean).
  const signs = params.surfaceTexture === "diamond" ? [1, -1] : [1];
  let result = body;
  for (const s of signs) {
    result = result.cut(buildSet(s)) as Solid;
  }
  return result;
}

/** Fuse a wider flange ring at the base. Done after flutes so the skirt face is smooth. */
function applySkirt(body: Solid, params: KnobParams): Solid {
  if (params.skirt === "none") return body;
  const h = Math.min(params.skirtHeight, maxSkirtHeight(params));
  const r = Math.max(params.bodyDiameter / 2, params.skirtDiameter / 2);
  if (h <= 0 || r <= params.bodyDiameter / 2 + 0.01) return body;
  const ring = makeCylinder(r, h) as Solid;
  return body.fuse(ring) as Solid;
}

/**
 * Chamfer the bottom outer edge to compensate for first-layer squish
 * (elephant foot). Applied before the socket cut so only the outer rim is
 * touched. Only attempted when the bottom edge is a clean, chamferable loop:
 * a flange skirt always gives a plain circle; otherwise the body must be
 * straight (not lofted) and not a rounded polygon (tangent line+arc chains and
 * lofted edges abort the chamfer in OCCT).
 */
function applyBottomChamfer(body: Solid, params: KnobParams): Solid {
  const size = Math.min(params.bottomChamfer, 0.6);
  if (size <= 0.05) return body;
  const straight = Math.abs(params.bodyDiameter - params.topDiameter) < 0.02;
  const cleanBottom = params.skirt === "flange" || (straight && !hasComplexRim(params));
  if (!cleanBottom) return body;
  try {
    return body.chamfer(size, (e) => e.inPlane("XY", 0)) as Solid;
  } catch {
    return body;
  }
}

/** Build the full knob solid for the given parameters. */
export function buildKnob(params: KnobParams): Solid {
  let body = buildBody(params);
  body = applyTopEdge(body, params);
  body = applyTopStyle(body, params);
  body = applyIndicator(body, params);
  body = applyTicks(body, params);
  body = applyTexture(body, params);
  body = applySkirt(body, params);
  body = applyBottomChamfer(body, params);
  const depth = Math.min(params.shaftHoleDepth, maxShaftHoleDepth(params));
  const socket = buildShaftSocket(params, depth);
  let result = body.cut(socket) as Solid;
  // Insertion lead-in at the socket opening (bottom face).
  result = result.cut(socketLeadIn(params, 0, 0, false)) as Solid;
  return result;
}

/**
 * Fit-test coupon: five short pucks on a connecting bar, each with the shaft
 * socket cut at a different clearance — the current value −0.05 to +0.15 in
 * 0.05mm steps. Tick marks on top (1–5) identify the steps; print once, try
 * the shaft in each, dial in the clearance that fits best.
 */
export const FIT_TEST_OFFSETS = [-0.05, 0, 0.05, 0.1, 0.15];

export function buildFitTestPiece(params: KnobParams): Solid {
  const clearances = FIT_TEST_OFFSETS.map((o) =>
    Math.max(-0.1, Math.round((params.shaftClearance + o) * 100) / 100),
  );
  const maxR = SHAFTS[params.shaft].outerDiameter / 2 + Math.max(...clearances);
  const puckR = maxR + 2.5;
  const H = 8;
  const pitch = puckR * 2 + 2;

  // Pucks + connecting bars first, then all the cuts.
  let piece: Solid | null = null;
  for (let i = 0; i < clearances.length; i++) {
    const cx = i * pitch;
    const puck = makeCylinder(puckR, H, [cx, 0, 0]) as Solid;
    piece = piece ? (piece.fuse(puck) as Solid) : puck;
    if (i > 0) {
      const bar = makeBaseBox(pitch - 2 * puckR + 2, 6, 2).translate([cx - pitch / 2, 0, 0]);
      piece = piece.fuse(bar) as Solid;
    }
  }

  for (let i = 0; i < clearances.length; i++) {
    const cx = i * pitch;
    const p = { ...params, shaftClearance: clearances[i] };
    // Through-socket so the fit can be tested from either side and pushed out.
    const socket = buildShaftSocket(p, H).translate([cx, 0, 0]) as Solid;
    piece = (piece as Solid).cut(socket) as Solid;
    piece = piece.cut(socketLeadIn(p, cx, H, true)) as Solid;
    piece = piece.cut(socketLeadIn(p, cx, 0, false)) as Solid;
    // i+1 tick marks along the front of the top face.
    for (let j = 0; j <= i; j++) {
      const tick = makeBaseBox(0.8, 2.5, 0.7).translate([
        cx + (j - i / 2) * 1.8,
        puckR - 2.2,
        H - 0.5,
      ]);
      piece = piece.cut(tick) as Solid;
    }
  }
  return piece as Solid;
}
