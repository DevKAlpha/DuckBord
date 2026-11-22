/**
 * What can be done with the whiteboard selection, from the keyboard or the
 * style panel. Each action is one undo step.
 */
import { newId } from '@devbord/shared';
import { useSketch } from '../../controllers/sketchController';
import { translatePoints } from './geometry';

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

/** Moves the selection with the arrow keys. */
export function nudgeSelection(dx: number, dy: number) {
  const sel = selected();
  if (!sel) return;
  sel.model.setStrokePoints(
    new Map(sel.strokes.map((s) => [s.id, translatePoints(s.points, dx, dy)] as const)),
  );
}
