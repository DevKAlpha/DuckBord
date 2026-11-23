/**
 * Style panel beside the whiteboard sheet (story 24), like the properties
 * panel of Excalidraw: it shows only what applies to the current tool, or to
 * what is selected. With a selection, every choice restyles it at once (one
 * undo step) and also becomes the default for what is drawn next.
 *
 * Its buttons do not take the focus: while typing a free text, changing the
 * color or the size changes that text.
 */
import type { ReactNode } from 'react';
import {
  FILL_STYLES,
  ICON_IDS,
  INK_COLORS,
  LINE_STYLES,
  NOTE_COLORS,
  ROUGHNESS,
  useSketch,
  useSketchSnapshot,
  type InkColor,
  type SketchTool,
  type StrokeTool,
} from '../../controllers/sketchController';
import { IconButton, cx } from '../../design';
import { useT } from '../../i18n';
import { IconGlyph } from './IconGlyph';
import { deleteSelection, duplicateSelection } from './selectionActions';

const WIDTH_TOOLS: readonly StrokeTool[] = [
  'pen',
  'marker',
  'line',
  'arrow',
  'rect',
  'diamond',
  'ellipse',
];
const LINE_TOOLS: readonly StrokeTool[] = ['line', 'arrow', 'rect', 'diamond', 'ellipse'];
const ROUGH_TOOLS: readonly StrokeTool[] = [...LINE_TOOLS, 'icon', 'step'];
const FILL_TOOLS: readonly StrokeTool[] = ['rect', 'diamond', 'ellipse'];

/** Keeps the focus where it was (a free text being typed). */
const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault();

/** The free text being typed, if any: the panel restyles it. */
function typingText() {
  const el = document.activeElement;
  return el instanceof HTMLTextAreaElement && el.dataset.noteKind === 'text'
    ? (el.dataset.noteId ?? null)
    : null;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="flex shrink-0 flex-col gap-1">
      <legend className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
        {label}
      </legend>
      <div className="flex flex-wrap gap-1">{children}</div>
    </fieldset>
  );
}

function Choice({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      data-cursor-hint={label}
      onPointerDown={keepFocus}
      onClick={onClick}
      className={cx(
        'grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-ink transition-colors duration-100',
        active ? 'bg-accent-soft ring-2 ring-accent' : 'hover:bg-surface-3',
      )}
    >
      {children}
    </button>
  );
}

export function StylePanel() {
  const t = useT();
  const tool = useSketch((s) => s.tool);
  const selection = useSketch((s) => s.selection);
  const defaults = useSketch();
  const { strokes } = useSketchSnapshot();

  const selected = selection.length ? strokes.filter((s) => selection.includes(s.id)) : [];
  /** What the panel styles: the selected strokes, or the current tool. */
  const kinds: readonly (SketchTool | StrokeTool)[] = selected.length
    ? [...new Set(selected.map((s) => s.tool))]
    : [tool];
  const has = (list: readonly StrokeTool[]) =>
    kinds.some((k) => (list as readonly string[]).includes(k));
  // Shown values: the first selected stroke's, else the defaults.
  const first = selected[0];
  const color = first?.color ?? defaults.color;
  const sizeStep = first ? Math.max(0, [3, 6, 12].indexOf(first.size)) : defaults.sizeStep;
  const fill = first?.fill ?? defaults.fill;
  const dash = first?.dash ?? defaults.dash;
  const rough = first?.rough ?? defaults.rough;

  const drawing = selected.length > 0 || !['select', 'eraser', 'laser', 'note'].includes(tool);
  const sizeLabel = has(WIDTH_TOOLS) ? t('sketch.panel.width') : t('sketch.panel.size');

  const pickColor = (c: InkColor) => {
    const textId = typingText();
    if (textId) defaults.model?.updateNote(textId, { ink: c });
    defaults.setColor(c);
  };
  const pickSize = (step: 0 | 1 | 2) => {
    const textId = typingText();
    if (textId) defaults.model?.updateNote(textId, { fontStep: step });
    defaults.setSizeStep(step);
  };

  return (
    <aside
      aria-label={t('sketch.panel.aria')}
      className="flex shrink-0 gap-3 overflow-auto rounded-2xl border border-line-soft bg-card p-2.5 shadow-card sm:w-[136px] sm:flex-col"
    >
      {selected.length > 0 && (
        <div className="flex shrink-0 items-center gap-1 sm:flex-wrap">
          <span className="w-full text-xs text-muted">
            {t.n('sketch.panel.selected', selected.length)}
          </span>
          <IconButton
            icon="plus"
            label={t('sketch.panel.duplicate')}
            onClick={duplicateSelection}
          />
          <IconButton icon="trash" label={t('sketch.panel.delete')} onClick={deleteSelection} />
        </div>
      )}

      {tool === 'note' && !selected.length && (
        <Row label={t('sketch.panel.noteColor')}>
          {NOTE_COLORS.map((c) => (
            <Choice
              key={c}
              label={t(`sketch.note.${c}`)}
              active={defaults.noteColor === c}
              onClick={() => defaults.setNoteColor(c)}
            >
              <span
                className="block size-5 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.15)]"
                style={{ background: `var(--note-${c})` }}
              />
            </Choice>
          ))}
        </Row>
      )}

      {drawing && (
        <Row label={t('sketch.panel.stroke')}>
          {INK_COLORS.map((c) => (
            <Choice
              key={c}
              label={t(`sketch.color.${c}`)}
              active={color === c}
              onClick={() => pickColor(c)}
            >
              <span
                className="block size-5 rounded-[4px]"
                style={{ background: `var(--sk-${c})` }}
              />
            </Choice>
          ))}
        </Row>
      )}

      {drawing && (
        <Row label={sizeLabel}>
          {([0, 1, 2] as const).map((step) => (
            <Choice
              key={step}
              label={has(WIDTH_TOOLS) ? t(`sketch.width.${step}`) : t(`sketch.size.${step}`)}
              active={sizeStep === step}
              onClick={() => pickSize(step)}
            >
              <span
                className="block rounded-full"
                style={{
                  width: [4, 8, 13][step],
                  height: [4, 8, 13][step],
                  background: `var(--sk-${color})`,
                }}
              />
            </Choice>
          ))}
        </Row>
      )}

      {has(LINE_TOOLS) && (
        <Row label={t('sketch.panel.lineStyle')}>
          {LINE_STYLES.map((d) => (
            <Choice
              key={d}
              label={t(`sketch.dash.${d}`)}
              active={dash === d}
              onClick={() => defaults.setDash(d)}
            >
              <svg width="22" height="8" aria-hidden>
                <line
                  x1="2"
                  y1="4"
                  x2="20"
                  y2="4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={d === 'dashed' ? '5 4' : d === 'dotted' ? '0.1 4' : undefined}
                />
              </svg>
            </Choice>
          ))}
        </Row>
      )}

      {has(ROUGH_TOOLS) && (
        <Row label={t('sketch.panel.rough')}>
          {ROUGHNESS.map((r) => (
            <Choice
              key={r}
              label={t(`sketch.rough.${r}`)}
              active={rough === r}
              onClick={() => defaults.setRough(r)}
            >
              <svg width="22" height="12" aria-hidden>
                <path
                  d={
                    r === 0
                      ? 'M2 6 L20 6'
                      : r === 1
                        ? 'M2 7 Q6.5 3 11 6 T20 5'
                        : 'M2 8 Q4 1 7 7 T12 5 T16 8 T20 3'
                  }
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </Choice>
          ))}
        </Row>
      )}

      {has(FILL_TOOLS) && (
        <Row label={t('sketch.panel.fill')}>
          {FILL_STYLES.map((f) => (
            <Choice
              key={f}
              label={t(`sketch.fill.${f}`)}
              active={fill === f}
              onClick={() => defaults.setFill(f)}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                <defs>
                  <clipPath id={`sk-fill-${f}`}>
                    <rect x="2" y="2" width="14" height="14" rx="2" />
                  </clipPath>
                </defs>
                {f === 'solid' && (
                  <rect
                    x="2"
                    y="2"
                    width="14"
                    height="14"
                    rx="2"
                    fill="currentColor"
                    opacity="0.35"
                  />
                )}
                {f === 'hachure' && (
                  <path
                    clipPath={`url(#sk-fill-${f})`}
                    d="M-2 10 L10 -2 M-2 16 L16 -2 M2 20 L20 2 M8 20 L20 8"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                )}
                <rect
                  x="2"
                  y="2"
                  width="14"
                  height="14"
                  rx="2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            </Choice>
          ))}
        </Row>
      )}

      {tool === 'icon' && !selected.length && (
        <Row label={t('sketch.panel.icons')}>
          {ICON_IDS.map((id) => (
            <Choice
              key={id}
              label={t(`sketch.icon.${id}`)}
              active={defaults.icon === id}
              onClick={() => defaults.setIcon(id)}
            >
              <span style={{ color: `var(--sk-${color})` }}>
                <IconGlyph id={id} size={20} />
              </span>
            </Choice>
          ))}
        </Row>
      )}

      {!drawing && tool !== 'note' && (
        <p className="text-xs leading-snug text-muted sm:w-full">
          {tool === 'eraser'
            ? t('sketch.panel.hintEraser')
            : tool === 'laser'
              ? t('sketch.panel.hintLaser')
              : t('sketch.panel.hintSelect')}
        </p>
      )}
    </aside>
  );
}
