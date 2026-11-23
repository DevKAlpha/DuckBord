import { describe, expect, it } from 'vitest';
import type { Stroke } from '../../controllers/sketchController';
import {
  bounds,
  constrainEnd,
  contains,
  hitsStroke,
  outline,
  scalePoints,
  smoothTowards,
  strokeAt,
  translatePoints,
} from './geometry';

const stroke = (
  tool: Stroke['tool'],
  points: number[],
  size = 4,
  extra: Partial<Stroke> = {},
): Stroke => ({
  id: 's',
  tool,
  color: 'ink',
  size,
  points,
  fill: 'none',
  dash: 'solid',
  rough: 1,
  seed: 1,
  ...extra,
});

describe('sketch geometry', () => {
  it('smooths toward the pointer without overshooting', () => {
    expect(smoothTowards({ x: 0, y: 0 }, { x: 10, y: 0 }, 0)).toEqual({ x: 10, y: 0 });
    expect(smoothTowards({ x: 0, y: 0 }, { x: 10, y: 0 }, 0.5)).toEqual({ x: 5, y: 0 });
  });

  it('constrains shapes with Shift: squares, circles, icons and 45° lines', () => {
    expect(constrainEnd('rect', 0, 0, 30, -10)).toEqual({ x: 30, y: -30 });
    expect(constrainEnd('icon', 0, 0, 10, 40)).toEqual({ x: 40, y: 40 });
    const end = constrainEnd('arrow', 0, 0, 100, 8);
    expect(end.x).toBeCloseTo(Math.hypot(100, 8));
    expect(end.y).toBeCloseTo(0);
  });

  it('hits a freehand line near its ink only', () => {
    const line = stroke('pen', [0, 0, 100, 0]);
    expect(hitsStroke(line, 50, 10, 8)).toBe(true);
    expect(hitsStroke(line, 50, 30, 8)).toBe(false);
  });

  it('hits an empty rectangle on its border, a filled one anywhere inside', () => {
    const rect = stroke('rect', [0, 0, 200, 100]);
    expect(hitsStroke(rect, 200, 50, 5)).toBe(true);
    expect(hitsStroke(rect, 100, 50, 5)).toBe(false);
    expect(hitsStroke({ ...rect, fill: 'solid' }, 100, 50, 5)).toBe(true);
  });

  it('hits a diamond inside its rhombus only when filled', () => {
    const diamond = stroke('diamond', [0, 0, 100, 100], 4, { fill: 'hachure' });
    expect(hitsStroke(diamond, 50, 50, 1)).toBe(true);
    // The box corner is outside the rhombus.
    expect(hitsStroke(diamond, 5, 5, 1)).toBe(false);
  });

  it('icons and steps are picked anywhere on them', () => {
    expect(hitsStroke(stroke('icon', [0, 0, 60, 60]), 30, 30, 1)).toBe(true);
    expect(hitsStroke(stroke('step', [0, 0, 40, 40], 4, { label: '1' }), 20, 20, 1)).toBe(true);
  });

  it('samples an ellipse outline', () => {
    const pts = outline(stroke('ellipse', [0, 0, 100, 50]));
    expect(pts.length).toBeGreaterThan(40);
    expect(pts[0]).toBeCloseTo(100);
    expect(pts[1]).toBeCloseTo(25);
  });

  it('counts the wider marker ink', () => {
    const marker = stroke('marker', [0, 0, 100, 0], 6);
    expect(hitsStroke(marker, 50, 10, 2)).toBe(true);
  });

  it('finds the topmost stroke under the pointer', () => {
    const a = { ...stroke('rect', [0, 0, 100, 100], 4, { fill: 'solid' }), id: 'a' };
    const b = { ...stroke('rect', [50, 50, 150, 150], 4, { fill: 'solid' }), id: 'b' };
    expect(strokeAt([a, b], 75, 75, 2)?.id).toBe('b');
    expect(strokeAt([a, b], 300, 300, 2)).toBeNull();
  });

  it('selects with a marquee only what lies fully inside', () => {
    const box = { x0: 0, y0: 0, x1: 120, y1: 120 };
    expect(contains(box, bounds(stroke('rect', [10, 10, 100, 100])))).toBe(true);
    expect(contains(box, bounds(stroke('rect', [10, 10, 200, 100])))).toBe(false);
  });

  it('moves and resizes points', () => {
    expect(translatePoints([0, 0, 10, 20], 5, -5)).toEqual([5, -5, 15, 15]);
    expect(scalePoints([10, 10, 30, 50], 10, 10, 2, 0.5)).toEqual([10, 10, 50, 30]);
  });
});
