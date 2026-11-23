import { describe, expect, it } from 'vitest';
import type { Stroke } from '../../controllers/sketchController';
import { shapeAt } from './geometry';
import { parseClip } from './selectionActions';

const rect: Stroke = {
  id: 'r',
  tool: 'rect',
  color: 'blue',
  size: 6,
  points: [0, 0, 200, 100],
  fill: 'none',
  dash: 'solid',
  rough: 1,
  seed: 9,
  text: 'API',
};

const clip = (strokes: unknown) => JSON.stringify({ kind: 'duckbord/sketch', version: 1, strokes });

describe('whiteboard clipboard', () => {
  it('pastes DuckBord drawings with new ids, keeping their look and text', () => {
    const [pasted] = parseClip(clip([rect]))!;
    expect(pasted).toMatchObject({ tool: 'rect', color: 'blue', seed: 9, text: 'API' });
    expect(pasted!.id).not.toBe('r');
  });

  it('is not a drawing when the text is anything else', () => {
    expect(parseClip('hola equipo')).toBeNull();
    expect(parseClip('{"kind":"other"}')).toBeNull();
  });

  it('checks every field: unknown values get defaults, broken strokes are dropped', () => {
    const strokes = parseClip(
      clip([
        { tool: 'laser-cannon', color: 'neon', size: 9999, points: [0, 0, 10, 10], rough: 7 },
        { tool: 'pen', points: [0, 'x'] },
        { tool: 'pen', points: [1, 2, 3] },
        { tool: 'icon', icon: 'not-an-icon', points: [0, 0, 50, 50] },
      ]),
    )!;
    expect(strokes).toHaveLength(2);
    expect(strokes[0]).toMatchObject({
      tool: 'pen',
      color: 'ink',
      size: 64,
      rough: 1,
      fill: 'none',
    });
    expect(strokes[1]).toMatchObject({ tool: 'icon', icon: 'star' });
  });
});

describe('text inside shapes', () => {
  it('finds the closed shape under the pointer, even when it is empty inside', () => {
    expect(shapeAt([{ ...rect, text: undefined }], 100, 50)?.id).toBe('r');
    expect(shapeAt([{ ...rect, tool: 'line' }], 100, 50)).toBeNull();
    expect(shapeAt([rect], 300, 50)).toBeNull();
  });
});
