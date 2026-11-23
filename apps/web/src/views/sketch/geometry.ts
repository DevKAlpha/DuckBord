/**
 * Pure whiteboard geometry: input smoothing, shape constraints, bounds, hit
 * tests (eraser, selection) and move/resize math. No DOM state, so it is
 * unit-tested directly. Drawing lives in render.ts.
 */
import type { Stroke, StrokeTool } from '../../controllers/sketchController';

/** Freehand tools follow the hand; the rest are defined by two points. */
export const isFreehand = (tool: StrokeTool) => tool === 'pen' || tool === 'marker';

/** Two-point lines (start → end). */
export const isLine = (tool: StrokeTool) => tool === 'line' || tool === 'arrow';

/** Shapes with an inside, which can be filled. */
export const isClosed = (tool: StrokeTool) =>
  tool === 'rect' || tool === 'diamond' || tool === 'ellipse';

/** Items defined by a box: closed shapes, icons and numbered steps. */
export const isBox = (tool: StrokeTool) => isClosed(tool) || tool === 'icon' || tool === 'step';

/** A fresh seed for the hand-drawn wobble of a new stroke (never 0: rough.js reads it as random). */
export const newSeed = () => Math.floor(Math.random() * 2147483646) + 1;

/** The number the next step marker gets: one more than the highest on the sheet. */
export function nextStep(strokes: readonly Stroke[]) {
  let top = 0;
  for (const s of strokes) if (s.tool === 'step') top = Math.max(top, Number(s.label) || 0);
  return top + 1;
}

/** Rounds to the stored precision (whole sheet units keep the CRDT small). */
export const snap = (v: number) => Math.round(v);

/**
 * "Lazy brush" smoothing: the ink moves part of the way toward the pointer
 * each sample. It removes mouse jitter without a visible lag. `amount` is
 * 0 (raw) to 1 (very smooth).
 */
export function smoothTowards(
  prev: { x: number; y: number },
  raw: { x: number; y: number },
  amount: number,
) {
  const k = 1 - amount;
  return { x: prev.x + (raw.x - prev.x) * k, y: prev.y + (raw.y - prev.y) * k };
}

/**
 * Shift-constrained shapes: square boxes and circles, and lines snapped to
 * 45° steps. Returns the adjusted end point.
 */
export function constrainEnd(tool: StrokeTool, x0: number, y0: number, x: number, y: number) {
  const dx = x - x0;
  const dy = y - y0;
  if (isBox(tool)) {
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    return { x: x0 + Math.sign(dx || 1) * side, y: y0 + Math.sign(dy || 1) * side };
  }
  const len = Math.hypot(dx, dy);
  const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  return { x: x0 + Math.cos(angle) * len, y: y0 + Math.sin(angle) * len };
}

/** Normalized box of a two-point stroke. */
export function boxOf(points: readonly number[]) {
  const [x0 = 0, y0 = 0, x1 = x0, y1 = y0] = points;
  return {
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    w: Math.abs(x1 - x0),
    h: Math.abs(y1 - y0),
  };
}

/** Width actually painted (pen ink swells with speed, the marker is wide). */
export const paintedWidth = (stroke: Stroke) =>
  stroke.tool === 'marker'
    ? stroke.size * 3
    : stroke.tool === 'pen'
      ? stroke.size * 1.6
      : stroke.size;

/** The two barb end points of an arrow ending at (x1, y1). */
export function arrowHead(x0: number, y0: number, x1: number, y1: number, size: number) {
  const angle = Math.atan2(y1 - y0, x1 - x0);
  // Never longer than 40% of the arrow: short arrows keep a readable shaft.
  const len = Math.min(Math.max(16, size * 4), Math.hypot(x1 - x0, y1 - y0) * 0.4);
  const spread = Math.PI / 7;
  return [
    x1 - Math.cos(angle - spread) * len,
    y1 - Math.sin(angle - spread) * len,
    x1 - Math.cos(angle + spread) * len,
    y1 - Math.sin(angle + spread) * len,
  ];
}

/** Polyline that follows the visible stroke (shapes are sampled), for hit tests. */
export function outline(stroke: Stroke): number[] {
  const p = stroke.points;
  if (isFreehand(stroke.tool) || p.length < 4) return [...p];
  const [x0, y0, x1, y1] = p as [number, number, number, number];
  if (stroke.tool === 'line') return [x0, y0, x1, y1];
  if (stroke.tool === 'arrow') return [x0, y0, x1, y1, ...arrowHead(x0, y0, x1, y1, stroke.size)];
  const { x, y, w, h } = boxOf(p);
  if (stroke.tool === 'diamond') {
    return [x + w / 2, y, x + w, y + h / 2, x + w / 2, y + h, x, y + h / 2, x + w / 2, y];
  }
  if (stroke.tool === 'ellipse') {
    const out: number[] = [];
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      out.push(x + w / 2 + (Math.cos(a) * w) / 2, y + h / 2 + (Math.sin(a) * h) / 2);
    }
    return out;
  }
  return [x, y, x + w, y, x + w, y + h, x, y + h, x, y];
}

/** Distance from point P to segment AB. */
function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** True when (x, y) is inside the area of a filled shape, an icon or a step. */
function insideArea(stroke: Stroke, x: number, y: number) {
  // A shape with text inside is picked anywhere: the text belongs to it.
  const solid =
    stroke.tool === 'icon' ||
    stroke.tool === 'step' ||
    stroke.fill !== 'none' ||
    Boolean(stroke.text);
  if (!isBox(stroke.tool) || !solid) return false;
  const b = boxOf(stroke.points);
  if (b.w === 0 || b.h === 0) return false;
  const u = (x - b.x) / b.w - 0.5;
  const v = (y - b.y) / b.h - 0.5;
  if (stroke.tool === 'ellipse' || stroke.tool === 'step') return u * u + v * v <= 0.25;
  if (stroke.tool === 'diamond') return Math.abs(u) + Math.abs(v) <= 0.5;
  return Math.abs(u) <= 0.5 && Math.abs(v) <= 0.5;
}

/** True when a circle of `radius` at (x, y) touches the stroke's ink (or its filled area). */
export function hitsStroke(stroke: Stroke, x: number, y: number, radius: number): boolean {
  if (insideArea(stroke, x, y)) return true;
  const line = outline(stroke);
  const reach = radius + paintedWidth(stroke) / 2;
  if (line.length === 2) return Math.hypot(x - line[0]!, y - line[1]!) <= reach;
  for (let i = 0; i + 3 < line.length; i += 2) {
    if (segmentDistance(x, y, line[i]!, line[i + 1]!, line[i + 2]!, line[i + 3]!) <= reach)
      return true;
  }
  return false;
}

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Box around the stroke's ink. */
export function bounds(stroke: Stroke): Bounds {
  const p = outline(stroke);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i + 1 < p.length; i += 2) {
    x0 = Math.min(x0, p[i]!);
    x1 = Math.max(x1, p[i]!);
    y0 = Math.min(y0, p[i + 1]!);
    y1 = Math.max(y1, p[i + 1]!);
  }
  const pad = paintedWidth(stroke) / 2;
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
}

/** Topmost closed shape (rectangle, diamond, circle) whose inside holds the point. */
export function shapeAt(strokes: readonly Stroke[], x: number, y: number) {
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i]!;
    if (isClosed(s.tool) && insideArea({ ...s, fill: 'solid' }, x, y)) return s;
  }
  return null;
}

/** Box around several strokes, or null for none. */
export function unionBounds(strokes: readonly Stroke[]): Bounds | null {
  if (strokes.length === 0) return null;
  return strokes.map(bounds).reduce((a, b) => ({
    x0: Math.min(a.x0, b.x0),
    y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
  }));
}

/** True when `inner` lies completely inside `outer` (marquee selection). */
export const contains = (outer: Bounds, inner: Bounds) =>
  inner.x0 >= outer.x0 && inner.y0 >= outer.y0 && inner.x1 <= outer.x1 && inner.y1 <= outer.y1;

/** Topmost stroke under the point, if any (the last drawn is on top). */
export function strokeAt(strokes: readonly Stroke[], x: number, y: number, radius: number) {
  for (let i = strokes.length - 1; i >= 0; i--) {
    if (hitsStroke(strokes[i]!, x, y, radius)) return strokes[i]!;
  }
  return null;
}

/** Points moved by (dx, dy), snapped to whole units. */
export const translatePoints = (points: readonly number[], dx: number, dy: number) =>
  points.map((v, i) => snap(v + (i % 2 === 0 ? dx : dy)));

/** Points scaled from the anchor (ax, ay), snapped to whole units. */
export const scalePoints = (
  points: readonly number[],
  ax: number,
  ay: number,
  sx: number,
  sy: number,
) => points.map((v, i) => snap(i % 2 === 0 ? ax + (v - ax) * sx : ay + (v - ay) * sy));
