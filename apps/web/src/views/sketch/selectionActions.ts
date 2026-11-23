/**
 * What can be done with the whiteboard selection, from the keyboard or the
 * style panel. Each action is one undo step.
 */
import { newId } from '@devbord/shared';
import {
  FILL_STYLES,
  ICON_IDS,
  INK_COLORS,
  LINE_STYLES,
  NOTE_TEXT_MAX,
  ROUGHNESS,
  STROKE_TOOLS,
  useSketch,
  type Stroke,
} from '../../controllers/sketchController';
import { newSeed, translatePoints, unionBounds } from './geometry';

/** Copies land a little down and right, so they are visible. */
const DUPLICATE_OFFSET = 24;

const selected = () => {
  const { model, selection } = useSketch.getState();
  if (!model || selection.length === 0) return null;
  const ids = new Set(selection);
  return { model, ids, strokes: model.getSnapshot().strokes.filter((s) => ids.has(s.id)) };
};

export function deleteSelection() {
  const sel = selected();
  if (!sel) return;
  sel.model.stopCapturing();
  sel.model.removeStrokes(sel.ids);
  sel.model.stopCapturing();
  useSketch.getState().setSelection([]);
}

/** Duplicates the selection and selects the copies (same look: same seeds). */
export function duplicateSelection() {
  const sel = selected();
  if (!sel) return;
  const copies = sel.strokes.map((s) => ({
    ...s,
    id: newId(),
    points: translatePoints(s.points, DUPLICATE_OFFSET, DUPLICATE_OFFSET),
  }));
  sel.model.addStrokes(copies);
  useSketch.getState().setSelection(copies.map((s) => s.id));
}

/** Selects everything drawn on the sheet (and switches to the select tool). */
export function selectAll() {
  const { model, setTool, setSelection } = useSketch.getState();
  if (!model) return;
  setTool('select');
  setSelection(model.getSnapshot().strokes.map((s) => s.id));
}

/** Marks DuckBord drawings in the clipboard (anything else pastes as text). */
const CLIP_KIND = 'duckbord/sketch';
/** A paste never brings more than this (a clipboard is not trusted input). */
const CLIP_MAX = 1000;
const POINTS_MAX = 40_000;

/** The selection as clipboard text, or null when nothing is selected. */
export function copySelection(): string | null {
  const sel = selected();
  return sel && sel.strokes.length
    ? JSON.stringify({ kind: CLIP_KIND, version: 1, strokes: sel.strokes })
    : null;
}

const oneOf = <T extends string | number>(list: readonly T[], v: unknown, fallback: T): T =>
  (list as readonly unknown[]).includes(v) ? (v as T) : fallback;

/**
 * Strokes from clipboard text, checked field by field (the text may come from
 * anywhere): unknown values get the defaults, broken strokes are dropped.
 * Null when the text is not a DuckBord drawing.
 */
export function parseClip(text: string): Stroke[] | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  const clip = data as { kind?: unknown; strokes?: unknown };
  if (!clip || clip.kind !== CLIP_KIND || !Array.isArray(clip.strokes)) return null;
  const out: Stroke[] = [];
  for (const raw of clip.strokes.slice(0, CLIP_MAX) as Record<string, unknown>[]) {
    const points = raw?.points;
    if (
      !Array.isArray(points) ||
      points.length < 2 ||
      points.length > POINTS_MAX ||
      points.length % 2 !== 0 ||
      !points.every((n) => typeof n === 'number' && Number.isFinite(n))
    )
      continue;
    const tool = oneOf(STROKE_TOOLS, raw.tool, 'pen');
    const size = typeof raw.size === 'number' && Number.isFinite(raw.size) ? raw.size : 6;
    out.push({
      id: newId(),
      tool,
      color: oneOf(INK_COLORS, raw.color, 'ink'),
      size: Math.min(64, Math.max(1, size)),
      points: points as number[],
      fill: oneOf(FILL_STYLES, raw.fill, 'none'),
      dash: oneOf(LINE_STYLES, raw.dash, 'solid'),
      rough: oneOf(ROUGHNESS, raw.rough, 1),
      seed: typeof raw.seed === 'number' && raw.seed >= 1 ? Math.floor(raw.seed) : newSeed(),
      ...(tool === 'icon' ? { icon: oneOf(ICON_IDS, raw.icon, 'star') } : {}),
      ...(tool === 'step' && typeof raw.label === 'string' ? { label: raw.label.slice(0, 4) } : {}),
      ...(typeof raw.text === 'string' && raw.text
        ? { text: raw.text.slice(0, NOTE_TEXT_MAX) }
        : {}),
    });
  }
  return out;
}

/**
 * Pastes DuckBord drawings: centered on the pointer when it is over the sheet,
 * otherwise a little off the originals. The pasted strokes end up selected.
 * Returns false when the text is not a DuckBord drawing.
 */
export function pasteClip(text: string, at: { x: number; y: number } | null): boolean {
  const strokes = parseClip(text);
  const { model, setTool, setSelection } = useSketch.getState();
  if (!strokes || !model) return false;
  if (strokes.length === 0) return true;
  const box = unionBounds(strokes)!;
  const dx = at ? at.x - (box.x0 + box.x1) / 2 : DUPLICATE_OFFSET;
  const dy = at ? at.y - (box.y0 + box.y1) / 2 : DUPLICATE_OFFSET;
  const placed = strokes.map((s) => ({ ...s, points: translatePoints(s.points, dx, dy) }));
  model.addStrokes(placed);
  setTool('select');
  setSelection(placed.map((s) => s.id));
  return true;
}

/** Moves the selection with the arrow keys. */
export function nudgeSelection(dx: number, dy: number) {
  const sel = selected();
  if (!sel) return;
  sel.model.setStrokePoints(
    new Map(sel.strokes.map((s) => [s.id, translatePoints(s.points, dx, dy)] as const)),
  );
}
