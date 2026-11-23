/**
 * The whiteboard ("pizarra") overlay: a floating sheet above the Kanban board
 * for quick explanations and sketches, alone or with the team.
 *
 * Layout: header (title, live status, expand, close) · style panel and sheet ·
 * dock with the tools. It floats over the board (which stays visible behind a
 * soft blur) and can be expanded to fill the window for an immersive session.
 *
 * Story 24: the look of Excalidraw. Hand-drawn strokes, select-move-resize,
 * line and diamond for diagrams, DuckBord's own icons, numbered steps to
 * explain in order, a style panel, and a laser that fades like a presenter's.
 *
 * Keyboard (same letters as Excalidraw where it has the tool):
 * V seleccionar · P lápiz · M marcador · L línea · A flecha · R rectángulo ·
 * D rombo · O círculo · T texto · N nota · I iconos · S pasos · E borrador ·
 * K láser · [ ] grosor · Ctrl+Z / Ctrl+Shift+Z · Ctrl+A todo · Ctrl+D duplicar ·
 * Supr borrar selección · flechas mover · Ctrl+C / Ctrl+X / Ctrl+V copiar, cortar y
 * pegar (también texto) · Enter o doble clic escribe dentro de una forma ·
 * Esc suelta la selección y luego cierra.
 *
 * Loaded lazily: none of this ships until the first time someone opens it.
 */
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useCollab } from '../../controllers/collabController';
import {
  SHEET,
  useSketch,
  useSketchSnapshot,
  type SketchTool,
} from '../../controllers/sketchController';
import {
  IconButton,
  PixelIcon,
  animateIn,
  animateLand,
  animateOut,
  confirm,
  cx,
  type IconName,
} from '../../design';
import { useT, type MessageKey } from '../../i18n';
import { SheetSwitcher } from './SheetSwitcher';
import { SketchSheet, type SketchSheetHandle } from './SketchSheet';
import { StylePanel } from './StylePanel';
import {
  copySelection,
  deleteSelection,
  duplicateSelection,
  nudgeSelection,
  pasteClip,
  selectAll,
} from './selectionActions';
import './sketch.css';

/**
 * Hand-written fonts of the whiteboard: Shantell Sans, and Gaegu for Hangul.
 * Requested when the whiteboard module loads, not with the app.
 */
const HAND_FONTS =
  'https://fonts.googleapis.com/css2?family=Shantell+Sans:wght@400;600&family=Gaegu:wght@400;700&display=swap';
if (typeof document !== 'undefined' && !document.querySelector(`link[href="${HAND_FONTS}"]`)) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = HAND_FONTS;
  document.head.appendChild(link);
}

interface ToolDef {
  tool: SketchTool;
  icon: IconName;
  label: MessageKey;
  key: string;
}

/** The dock, in groups: select · freehand · diagrams · words and marks · erase and point. */
const TOOL_GROUPS: ReadonlyArray<readonly ToolDef[]> = [
  [{ tool: 'select', icon: 'cursor', label: 'sketch.tool.select', key: 'v' }],
  [
    { tool: 'pen', icon: 'edit', label: 'sketch.tool.pen', key: 'p' },
    { tool: 'marker', icon: 'marker', label: 'sketch.tool.marker', key: 'm' },
  ],
  [
    { tool: 'line', icon: 'line', label: 'sketch.tool.line', key: 'l' },
    { tool: 'arrow', icon: 'arrow', label: 'sketch.tool.arrow', key: 'a' },
    { tool: 'rect', icon: 'square', label: 'sketch.tool.rect', key: 'r' },
    { tool: 'diamond', icon: 'diamond', label: 'sketch.tool.diamond', key: 'd' },
    { tool: 'ellipse', icon: 'circle', label: 'sketch.tool.ellipse', key: 'o' },
  ],
  [
    { tool: 'text', icon: 'type', label: 'sketch.tool.text', key: 't' },
    { tool: 'note', icon: 'note', label: 'sketch.tool.note', key: 'n' },
    { tool: 'icon', icon: 'star', label: 'sketch.tool.icon', key: 'i' },
    { tool: 'step', icon: 'step', label: 'sketch.tool.step', key: 's' },
  ],
  [
    { tool: 'eraser', icon: 'eraser', label: 'sketch.tool.eraser', key: 'e' },
    { tool: 'laser', icon: 'laser', label: 'sketch.tool.laser', key: 'k' },
  ],
];
const TOOLS = TOOL_GROUPS.flat();

/** Drag distance (px) that turns a press on the note button into "peel a note off the pad". */
const PEEL_SLOP = 6;

export default function Whiteboard({ boardName, team }: { boardName: string; team: boolean }) {
  const t = useT();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sheetRef = useRef<SketchSheetHandle>(null);
  const model = useSketch((s) => s.model);
  const expanded = useSketch((s) => s.expanded);
  const tool = useSketch((s) => s.tool);
  const noteColor = useSketch((s) => s.noteColor);
  const { canUndo, canRedo, strokes, notes } = useSketchSnapshot();
  const peerList = useCollab((s) => s.peers);
  const peers = Object.keys(peerList).length;
  const sheetId = useSketch((s) => s.sheetId);
  const status = useCollab((s) => s.status);
  /** Note being peeled off the pad (screen position), if any. */
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  const close = async () => {
    await animateOut(dialogRef.current);
    useSketch.getState().hide();
  };

  // Open as a modal dialog: top layer, focus stays inside, Esc handled below.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal?.();
    animateIn(dialog);
  }, []);

  // Copy, cut and paste through the browser clipboard events: no permission
  // prompt, and a copy can be pasted on another whiteboard, board or tab.
  // Inside a text field they keep their normal meaning.
  useEffect(() => {
    const inField = (e: Event) =>
      e.target instanceof Element &&
      e.target.closest('textarea, input, select, [contenteditable="true"]') !== null;
    const copy = (e: ClipboardEvent, cut: boolean) => {
      if (inField(e)) return;
      const data = copySelection();
      if (!data) return;
      e.preventDefault();
      e.clipboardData?.setData('text/plain', data);
      if (cut) deleteSelection();
    };
    const onCopy = (e: ClipboardEvent) => copy(e, false);
    const onCut = (e: ClipboardEvent) => copy(e, true);
    const onPaste = (e: ClipboardEvent) => {
      if (inField(e) || !useSketch.getState().model) return;
      const text = e.clipboardData?.getData('text/plain') ?? '';
      if (!text.trim()) return;
      e.preventDefault();
      const at = sheetRef.current?.pointer() ?? null;
      if (pasteClip(text, at)) return;
      // Any other text becomes a free text on the sheet.
      const p = at ?? { x: SHEET.width / 2 - 80, y: SHEET.height / 2 };
      sheetRef.current?.placeNote('text', p.x, p.y, text.slice(0, 600));
    };
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
    };
  }, []);

  // Keyboard shortcuts (never while typing in a note).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Keys sent to window/document have no element target.
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('textarea, input, select, [contenteditable="true"]')) {
        // The browser undo stack is page-wide: in an empty note it would edit another one.
        const field = target as HTMLTextAreaElement;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !field.value)
          e.preventDefault();
        return;
      }
      const { model: m, setTool, setSizeStep, sizeStep: step, selection } = useSketch.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) m?.redo();
        else m?.undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        m?.redo();
        return;
      }
      if (mod && key === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }
      if (mod && key === 'd') {
        e.preventDefault();
        duplicateSelection();
        return;
      }
      if (mod || e.altKey) return;
      if (e.key === 'Escape' && selection.length) {
        // Handled here, not by the dialog: Chrome force-closes a dialog whose
        // Esc was cancelled twice without the user doing anything in between.
        e.preventDefault();
        useSketch.getState().setSelection([]);
        return;
      }
      if (e.key === 'Enter' && selection.length === 1) {
        // Enter writes inside the selected shape (if it is one).
        e.preventDefault();
        sheetRef.current?.editLabel(selection[0]!);
        return;
      }
      if (selection.length) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          deleteSelection();
          return;
        }
        const arrows: Record<string, [number, number]> = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
        };
        const dir = arrows[e.key];
        if (dir) {
          e.preventDefault();
          const k = e.shiftKey ? 10 : 1;
          nudgeSelection(dir[0] * k, dir[1] * k);
          return;
        }
      }
      if (e.key === '[') setSizeStep(Math.max(0, step - 1) as 0 | 1 | 2);
      if (e.key === ']') setSizeStep(Math.min(2, step + 1) as 0 | 1 | 2);
      const hit = TOOLS.find((d) => d.key === key);
      if (hit) setTool(hit.tool);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /** Press on the note button: a click picks the tool, a drag peels a note off the pad. */
  const onNotePadDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const start = { x: e.clientX, y: e.clientY };
    let peeling = false;
    const move = (ev: PointerEvent) => {
      if (!peeling && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < PEEL_SLOP) return;
      peeling = true;
      setGhost({ x: ev.clientX, y: ev.clientY });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setGhost(null);
      if (!peeling) return;
      const p = sheetRef.current?.toSheet(ev.clientX, ev.clientY);
      if (p) sheetRef.current?.placeNote('note', p.x, p.y);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const pick = (next: SketchTool, el: HTMLElement) => {
    useSketch.getState().setTool(next);
    animateLand(el);
  };

  const empty = strokes.length === 0 && notes.length === 0;

  return (
    <dialog
      ref={dialogRef}
      aria-label={t('sketch.title')}
      className={cx(
        'sk-root m-auto max-h-none max-w-none flex-col overflow-hidden rounded-2xl border border-line-soft bg-surface p-0 text-ink shadow-lift outline-none open:flex',
        'backdrop:bg-black/25 backdrop:backdrop-blur-[3px]',
        expanded
          ? 'h-[calc(100dvh-16px)] w-[calc(100vw-16px)]'
          : 'h-[min(780px,calc(100dvh-32px))] w-[min(1280px,calc(100vw-32px))]',
      )}
      // However it closes (Esc, or the browser closing it), the state follows,
      // so the whiteboard can always be opened again.
      onClose={() => useSketch.getState().hide()}
      onCancel={(e) => {
        // Esc: first leaves the note being written or drops the selection, then closes.
        e.preventDefault();
        const active = document.activeElement;
        if (active instanceof HTMLTextAreaElement) active.blur();
        else if (useSketch.getState().selection.length) useSketch.getState().setSelection([]);
        else void close();
      }}
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line-soft px-3">
        <PixelIcon name="sketch" className="text-accent" />
        <h2 className="text-lg">{t('sketch.title')}</h2>
        <span className="hidden max-w-40 shrink-0 truncate text-sm text-muted sm:inline">
          {boardName} ·
        </span>
        <SheetSwitcher key={sheetId} team={team} />
        {team && (
          <span
            className={cx(
              'ml-1 shrink-0 rounded-full px-2 py-0.5 text-xs',
              peers ? 'bg-accent-soft text-accent' : 'bg-surface-3 text-muted',
            )}
          >
            {peers
              ? t('sketch.live', { n: peers + 1 })
              : status === 'connecting'
                ? t('common.connecting')
                : t('sketch.alone')}
          </span>
        )}
        <span className="flex-1" />
        {/* Who is on the whiteboard with you (team boards). */}
        {team && peers > 0 && (
          <span className="flex shrink-0 -space-x-1" aria-label={t('sketch.people')}>
            {Object.entries(peerList).map(([id, peer]) => (
              <span
                key={id}
                title={peer.name}
                className="grid size-6 place-items-center rounded-md text-[11px] text-white ring-2 ring-surface"
                style={{ background: peer.color }}
              >
                {peer.name.slice(0, 1).toUpperCase()}
              </span>
            ))}
          </span>
        )}
        <IconButton
          icon={expanded ? 'shrink' : 'expand'}
          label={expanded ? t('sketch.shrink') : t('sketch.fullscreen')}
          onClick={() => {
            useSketch.getState().toggleExpanded();
            animateLand(dialogRef.current);
          }}
        />
        <IconButton icon="close" label={t('sketch.close')} onClick={() => void close()} />
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:flex-row">
        {model && <StylePanel />}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {model ? (
            <SketchSheet
              key={`${model.doc.guid}:${model.sheetId}`}
              ref={sheetRef}
              model={model}
              team={team}
            />
          ) : (
            <div className="grid flex-1 place-items-center text-sm text-muted">
              {team ? t('sketch.waitingTeam') : t('sketch.preparing')}
            </div>
          )}
          {model && empty && (
            <p className="pointer-events-none absolute inset-x-0 top-1/2 px-4 text-center text-sm text-faint">
              {team ? t('sketch.emptyTeam') : t('sketch.empty')}
            </p>
          )}
        </div>
      </div>

      {/* Dock: tools in groups, then history. */}
      <div className="flex shrink-0 justify-center px-3 pb-3">
        <div
          role="toolbar"
          aria-label={t('sketch.tools')}
          className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-line-soft bg-card p-1.5 shadow-card"
        >
          {TOOL_GROUPS.map((group, i) => (
            <div key={i} className="flex shrink-0 items-center gap-1">
              {i > 0 && <span className="mx-1 h-6 w-px shrink-0 bg-line-soft" />}
              {group.map((d) => (
                <button
                  key={d.tool}
                  type="button"
                  aria-label={`${t(d.label)} (${d.key.toUpperCase()})`}
                  data-cursor-hint={`${t(d.label)} · ${d.key.toUpperCase()}`}
                  aria-pressed={tool === d.tool}
                  onClick={(e) => pick(d.tool, e.currentTarget)}
                  onPointerDown={d.tool === 'note' ? onNotePadDown : undefined}
                  className={cx(
                    'relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl transition-colors duration-100',
                    tool === d.tool
                      ? 'bg-accent text-accent-ink shadow-card'
                      : 'text-muted hover:bg-surface-3 hover:text-ink',
                  )}
                >
                  <PixelIcon name={d.icon} />
                  <span className="sk-key" aria-hidden>
                    {d.key.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          ))}

          <span className="mx-1 h-6 w-px shrink-0 bg-line-soft" />

          <IconButton
            icon="undo"
            label={t('sketch.undo')}
            disabled={!canUndo}
            onClick={() => model?.undo()}
          />
          <IconButton
            icon="redo"
            label={t('sketch.redo')}
            disabled={!canRedo}
            onClick={() => model?.redo()}
          />
          <IconButton
            icon="trash"
            label={t('sketch.clear')}
            disabled={empty}
            onClick={async () => {
              const ok = await confirm(team ? t('sketch.clearTeam') : t('sketch.clearSolo'), {
                confirmLabel: t('sketch.clearLabel'),
                danger: true,
              });
              if (ok) model?.clear();
            }}
          />
        </div>
      </div>

      {ghost && (
        <div
          className="sk-ghost"
          style={
            {
              transform: `translate(${ghost.x - 8}px, ${ghost.y - 8}px) rotate(-4deg)`,
              '--note-bg': `var(--note-${noteColor})`,
            } as CSSProperties
          }
        />
      )}
    </dialog>
  );
}
