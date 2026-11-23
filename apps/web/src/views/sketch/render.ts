/**
 * How every whiteboard stroke looks (story 24): hand-drawn, like a sketch on
 * paper (the look of Excalidraw), instead of perfect vector lines.
 *
 * - Pen and marker: perfect-freehand turns the samples into an outline whose
 *   width follows the speed of the hand, then it is filled.
 * - Lines, arrows, shapes, icons and steps: rough.js draws them with a slight
 *   wobble. The wobble comes from the stroke's seed, so a shape looks the same
 *   on every screen and after every move or redraw.
 *
 * A stroke becomes a list of Path2D once (callers cache it per stroke object)
 * and colors are applied when painting, so a theme switch costs nothing.
 */
import getStroke from 'perfect-freehand';
import { RoughGenerator } from 'roughjs/bin/generator';
import type { Options } from 'roughjs/bin/core';
import type { Stroke } from '../../controllers/sketchController';
import { ICONS, placePath } from './icons';
import { arrowHead, boxOf, isClosed } from './geometry';

/** Hand-written type for the whiteboard (Hangul falls back to Gaegu). */
export const HAND_FONT = '"Shantell Sans", "Gaegu", "Comic Sans MS", cursive';

export interface PaintOp {
  path: Path2D;
  mode: 'stroke' | 'fill';
  width: number;
  alpha: number;
  dash: number[] | null;
  /** Hatching is kept inside the shape: rough lines would poke out of it. */
  clip?: Path2D;
}

export interface Painted {
  ops: PaintOp[];
  /** The number of a step marker, drawn in paper color on the ink disc. */
  text?: { value: string; x: number; y: number; size: number };
  /** Text written inside a shape, already wrapped, drawn in the ink color. */
  label?: { lines: string[]; x: number; y: number; size: number };
}

const gen = new RoughGenerator();

/** Font size of the text inside a shape: smaller shapes get smaller text. */
export const labelSize = (h: number) => Math.round(Math.min(28, Math.max(14, h * 0.3)));

/** How much of the shape's width the text may use (a diamond is narrow at the top). */
export const labelWidth = (tool: Stroke['tool'], w: number) =>
  w * (tool === 'diamond' ? 0.6 : tool === 'ellipse' ? 0.75 : 0.88);

let measure: CanvasRenderingContext2D | null = null;

/** Splits the text into lines that fit `width` (words are never cut). */
function wrap(text: string, size: number, width: number): string[] {
  measure ??= document.createElement('canvas').getContext('2d');
  if (!measure) return text.split('\n');
  measure.font = `${size}px ${HAND_FONT}`;
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure.measureText(next).width > width) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

// Marker strings: rough.js reports which color each path uses, which tells
// the outline (OUT) apart from the hatching (IN) and from a solid fill.
const OUT = 'out';
const IN = 'in';

/** Rough.js roughness per style step: precise, hand-drawn, sketchy. */
const ROUGHNESS = [0, 1, 2.2] as const;

const dashOf = (stroke: Stroke): number[] | null =>
  stroke.dash === 'dashed'
    ? [Math.max(10, stroke.size * 3), Math.max(8, stroke.size * 2.5)]
    : stroke.dash === 'dotted'
      ? [0.1, Math.max(7, stroke.size * 2.2)]
      : null;

/** Path through the points of a perfect-freehand outline (curves through the midpoints). */
function outlinePath(points: number[][]): Path2D {
  const path = new Path2D();
  if (points.length < 2) return path;
  const [first] = points as [number[]];
  path.moveTo(first[0]!, first[1]!);
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    path.quadraticCurveTo(a[0]!, a[1]!, (a[0]! + b[0]!) / 2, (a[1]! + b[1]!) / 2);
  }
  path.closePath();
  return path;
}

/** Freehand ink: filled outline with speed-based width (pen) or constant width (marker). */
function freehand(stroke: Stroke, done: boolean): Painted {
  const p = stroke.points;
  const pts: number[][] = [];
  for (let i = 0; i + 1 < p.length; i += 2) pts.push([p[i]!, p[i + 1]!]);
  const marker = stroke.tool === 'marker';
  const outline = getStroke(pts, {
    size: marker ? stroke.size * 3 : stroke.size * 1.6,
    thinning: marker ? 0 : 0.6,
    smoothing: 0.5,
    streamline: marker ? 0.35 : 0.25,
    simulatePressure: !marker,
    easing: (t) => Math.sin((t * Math.PI) / 2),
    last: done,
  });
  return {
    ops: [
      { path: outlinePath(outline), mode: 'fill', width: 0, alpha: marker ? 0.38 : 1, dash: null },
    ],
  };
}

/** Converts rough.js drawables into paint operations. */
function fromRough(
  drawables: ReturnType<RoughGenerator['line']>[],
  stroke: Stroke,
  dash = true,
  clip?: Path2D,
) {
  const ops: PaintOp[] = [];
  for (const d of drawables) {
    for (const info of gen.toPaths(d)) {
      const path = new Path2D(info.d);
      if (info.stroke === OUT) {
        ops.push({
          path,
          mode: 'stroke',
          width: info.strokeWidth,
          alpha: 1,
          dash: dash ? dashOf(stroke) : null,
        });
      } else if (info.stroke === IN) {
        // Hachure lines: softer than the outline, so the shape still reads first.
        ops.push({ path, mode: 'stroke', width: info.strokeWidth, alpha: 0.55, dash: null, clip });
      } else if (info.fill === IN) {
        ops.push({ path, mode: 'fill', width: 0, alpha: 0.22, dash: null });
      }
    }
  }
  return ops;
}

function roughOptions(stroke: Stroke, roughness: number): Options {
  return {
    seed: stroke.seed,
    roughness,
    bowing: 1,
    stroke: OUT,
    strokeWidth: stroke.size,
    // Dashed and dotted lines look tidier drawn once.
    disableMultiStroke: stroke.dash !== 'solid',
    preserveVertices: roughness === 0,
    ...(isClosed(stroke.tool) && stroke.fill !== 'none'
      ? {
          fill: IN,
          fillStyle: stroke.fill === 'solid' ? 'solid' : 'hachure',
          fillWeight: Math.max(1, stroke.size / 2),
          hachureGap: Math.max(8, stroke.size * 4),
        }
      : {}),
  };
}

/** An icon of DuckBord's set, drawn in its box. */
function icon(stroke: Stroke): Painted {
  const { x, y, w, h } = boxOf(stroke.points);
  const side = Math.max(8, Math.min(w, h));
  const k = side / 24;
  const ox = x + (w - side) / 2;
  const oy = y + (h - side) / 2;
  const options: Options = {
    seed: stroke.seed,
    roughness: [0, 0.5, 1.1][stroke.rough],
    bowing: 0.6,
    stroke: OUT,
    strokeWidth: Math.max(2, (side / 24) * 1.7),
    disableMultiStroke: true,
    preserveVertices: true,
  };
  const parts = ICONS[stroke.icon ?? 'star'].map((part) =>
    'p' in part
      ? gen.path(placePath(part.p, ox, oy, k), options)
      : 'c' in part
        ? gen.circle(ox + part.c[0] * k, oy + part.c[1] * k, part.c[2] * 2 * k, options)
        : 'e' in part
          ? gen.ellipse(
              ox + part.e[0] * k,
              oy + part.e[1] * k,
              part.e[2] * k,
              part.e[3] * k,
              options,
            )
          : gen.rectangle(
              ox + part.r[0] * k,
              oy + part.r[1] * k,
              part.r[2] * k,
              part.r[3] * k,
              options,
            ),
  );
  return { ops: fromRough(parts, stroke, false) };
}

/** A numbered step: an ink disc with the number in paper color. */
function step(stroke: Stroke): Painted {
  const { x, y, w, h } = boxOf(stroke.points);
  const d = Math.max(16, Math.min(w, h));
  const cx = x + w / 2;
  const cy = y + h / 2;
  const disc = gen.circle(cx, cy, d, {
    seed: stroke.seed,
    roughness: [0, 0.6, 1.2][stroke.rough],
    stroke: OUT,
    strokeWidth: Math.max(2, d / 18),
    fill: IN,
    fillStyle: 'solid',
    disableMultiStroke: true,
  });
  const ops = fromRough([disc], stroke, false).map((op) =>
    op.mode === 'fill' ? { ...op, alpha: 1 } : op,
  );
  return { ops, text: { value: stroke.label ?? '1', x: cx, y: cy + d * 0.04, size: d * 0.56 } };
}

/**
 * How one stroke is painted. `done` is false while it is still being drawn
 * (the freehand end then follows the pointer instead of closing with a cap).
 */
export function paintOf(stroke: Stroke, done = true): Painted {
  const p = stroke.points;
  if (stroke.tool === 'pen' || stroke.tool === 'marker' || p.length < 4) {
    return freehand(stroke, done);
  }
  if (stroke.tool === 'icon') return icon(stroke);
  if (stroke.tool === 'step') return step(stroke);

  const roughness = ROUGHNESS[stroke.rough];
  const options = roughOptions(stroke, roughness);
  const [x0, y0, x1, y1] = p as [number, number, number, number];
  if (stroke.tool === 'line')
    return { ops: fromRough([gen.line(x0, y0, x1, y1, options)], stroke) };
  if (stroke.tool === 'arrow') {
    const [ax, ay, bx, by] = arrowHead(x0, y0, x1, y1, stroke.size) as [
      number,
      number,
      number,
      number,
    ];
    const head = { ...options, disableMultiStroke: false };
    return {
      ops: [
        ...fromRough([gen.line(x0, y0, x1, y1, options)], stroke),
        // The head is always a solid line: dashes would break the tip.
        ...fromRough(
          [
            gen.line(ax, ay, x1, y1, { ...head, seed: stroke.seed + 1 }),
            gen.line(bx, by, x1, y1, { ...head, seed: stroke.seed + 2 }),
          ],
          stroke,
          false,
        ),
      ],
    };
  }
  const shape = closedShape(stroke, options);
  if (stroke.text) {
    const { x, y, w, h } = boxOf(p);
    const size = labelSize(h);
    shape.label = {
      lines: wrap(stroke.text, size, labelWidth(stroke.tool, w)),
      x: x + w / 2,
      y: y + h / 2,
      size,
    };
  }
  return shape;
}

/** Rectangle, diamond or circle, with its hatching kept inside. */
function closedShape(stroke: Stroke, options: Options): Painted {
  const { x, y, w, h } = boxOf(stroke.points);
  // The exact shape, to keep the hatching inside it.
  const clip = new Path2D();
  if (stroke.tool === 'diamond') {
    const corners: [number, number][] = [
      [x + w / 2, y],
      [x + w, y + h / 2],
      [x + w / 2, y + h],
      [x, y + h / 2],
    ];
    corners.forEach(([cx, cy], i) => (i ? clip.lineTo(cx, cy) : clip.moveTo(cx, cy)));
    clip.closePath();
    return { ops: fromRough([gen.polygon(corners, options)], stroke, true, clip) };
  }
  if (stroke.tool === 'ellipse') {
    clip.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    return {
      ops: fromRough([gen.ellipse(x + w / 2, y + h / 2, w, h, options)], stroke, true, clip),
    };
  }
  clip.rect(x, y, w, h);
  return { ops: fromRough([gen.rectangle(x, y, w, h, options)], stroke, true, clip) };
}

/** Paints a stroke in its ink color; `paper` colors a step's number. */
export function drawPainted(
  ctx: CanvasRenderingContext2D,
  painted: Painted,
  ink: string,
  paper: string,
) {
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  for (const op of painted.ops) {
    ctx.globalAlpha = op.alpha;
    if (op.mode === 'fill') {
      ctx.fill(op.path);
    } else {
      ctx.lineWidth = op.width;
      if (op.clip) {
        ctx.save();
        ctx.clip(op.clip);
      }
      if (op.dash) ctx.setLineDash(op.dash);
      ctx.stroke(op.path);
      if (op.dash) ctx.setLineDash([]);
      if (op.clip) ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
  const label = painted.label;
  if (label) {
    ctx.fillStyle = ink;
    ctx.font = `${label.size}px ${HAND_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lh = label.size * 1.25;
    const top = label.y - ((label.lines.length - 1) * lh) / 2;
    label.lines.forEach((line, i) => ctx.fillText(line, label.x, top + i * lh));
  }
  const text = painted.text;
  if (text) {
    ctx.fillStyle = paper;
    ctx.font = `600 ${Math.round(text.size)}px ${HAND_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.value, text.x, text.y);
  }
}

/**
 * The laser trail: a glowing line that tapers off toward its tail, like a
 * presenter's pointer. `pts` carry their age as life (1 new … 0 gone).
 */
export function laserPath(
  pts: ReadonlyArray<{ x: number; y: number; life: number }>,
  size: number,
) {
  const outline = getStroke(
    pts.map((p) => [p.x, p.y, p.life]),
    { size, thinning: 0.9, smoothing: 0.6, streamline: 0.2, simulatePressure: false, last: false },
  );
  return outlinePath(outline);
}
