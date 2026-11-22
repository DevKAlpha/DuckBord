/**
 * The whiteboard sheet: clean dotted paper, a canvas for the drawing, and a
 * scaled layer for sticky notes, free text and teammates' pens.
 *
 * Look (story 24): every stroke is hand-drawn, like a sketch on paper
 * (render.ts): pen ink swells with the speed of the hand, shapes and icons
 * wobble slightly, always the same way for the same stroke.
 *
 * Why it feels fluid with a mouse:
 *  - Pointer Events with pointer capture: a stroke keeps going even when the
 *    pointer leaves the sheet or crosses a note.
 *  - Coalesced events: every mouse sample the browser saw since the last
 *    frame is used, not just one per frame, so fast curves stay round.
 *  - Lazy-brush smoothing: no jitter, no visible lag.
 *  - A low-latency canvas (`desynchronized`) redrawn at most once per frame;
 *    each finished stroke is turned into paths once and cached.
 *  - The pointer shows what the tool will do: brush ring with the exact width
 *    and color, crosshair for shapes, the icon or the next step number.
 *
 * Gestures: left button uses the current tool; right button (or a pen's
 * eraser end) erases on the fly; Shift makes squares, circles and 45° lines.
 * Select tool: click or drag a box to select, drag to move, corners resize,
 * Shift adds to the selection.
 */
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type Ref,
} from 'react';
import { newId } from '@devbord/shared';
import { useCollab } from '../../controllers/collabController';
import { useIdentity } from '../../controllers/identityController';
import {
  ICON_SIZES,
  NOTE_SIZE,
  SHEET,
  SIZE_STEPS,
  STEP_SIZES,
  TEXT_SIZES,
  useSketch,
  useSketchSnapshot,
  type InkColor,
  type Note,
  type SketchModel,
  type Stroke,
} from '../../controllers/sketchController';
import { useThemeController } from '../../controllers/themeController';
import { isMotionLite } from '../../design';
import { useT } from '../../i18n';
import { TintedArrow } from '../team/RemoteCursors';
import {
  bounds,
  constrainEnd,
  contains,
  hitsStroke,
  isClosed,
  isFreehand,
  newSeed,
  nextStep,
  scalePoints,
  smoothTowards,
  snap,
  strokeAt,
  translatePoints,
  unionBounds,
  type Bounds,
} from './geometry';
import { IconGlyph } from './IconGlyph';
import { drawPainted, laserPath, paintOf, type Painted } from './render';
import { StickyNote } from './StickyNote';

/** Imperative API for the dock (dropping a note dragged from the pad). */
export interface SketchSheetHandle {
  /** Sheet coordinates of a screen point, or null when it is outside the sheet. */
  toSheet: (clientX: number, clientY: number) => { x: number; y: number } | null;
  placeNote: (kind: Note['kind'], x: number, y: number) => void;
}

const ASPECT = SHEET.width / SHEET.height;
const CELL = 40;
const ERASER_RADIUS = 14;
/** Extra reach (screen px) when clicking a thin line with the select tool. */
const PICK_PX = 6;
/** Half the size of a resize handle (screen px). */
const HANDLE_PX = 6;
/** Space between the selection frame and the ink (sheet units). */
const FRAME_PAD = 8;
/** Minimum distance between stored samples (sheet units): fewer points, same look. */
const MIN_STEP = 1.2;
/** Freehand points are sent to the shared doc in batches (ms). */
const FLUSH_MS = 40;
/** A shape starts only after this much movement, so a click never leaves a dot-shape. */
const SHAPE_SLOP = 3;
/** How long a laser pointer trail stays visible (ms). */
const LASER_FADE_MS = 900;
const LASER_COLOR = '#ff3b30';

/** A fading laser trail (ours or a teammate's), in sheet units. */
interface Trail {
  color: string;
  pts: Array<{ x: number; y: number; t: number }>;
}

interface LiveStroke {
  stroke: Stroke & { points: number[] };
  /** Not yet in the shared doc. */
  pending: number[];
  /** Smoothed pen position (lazy brush). */
  pos: { x: number; y: number };
  start: { x: number; y: number };
  /** Shapes: created in the doc once the pointer really moved. */
  begun: boolean;
}

/** A select-tool gesture in progress. */
interface Drag {
  mode: 'move' | 'scale' | 'marquee';
  start: { x: number; y: number };
  now: { x: number; y: number };
  shift: boolean;
  /** scale: the fixed corner, and the dragged corner where it started. */
  anchor?: { x: number; y: number };
  corner?: { x: number; y: number };
  /** marquee: what was selected before (Shift adds to it). */
  base?: readonly string[];
}

type Palette = Record<InkColor, string> & { paper: string; accent: string };

/**
 * Every pointer sample since the last event. Some events (synthetic ones,
 * some browsers) report an empty list: fall back to the event itself.
 */
const samplesOf = (e: globalThis.PointerEvent): globalThis.PointerEvent[] => {
  const list = e.getCoalescedEvents?.();
  return list && list.length ? list : [e];
};

function readPalette(el: Element): Palette {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim() || '#1d1d1f';
  return {
    ink: v('--sk-ink'),
    blue: v('--sk-blue'),
    red: v('--sk-red'),
    green: v('--sk-green'),
    orange: v('--sk-orange'),
    purple: v('--sk-purple'),
    paper: v('--sk-paper'),
    accent: v('--accent'),
  };
}

/** Scale factors of a resize gesture (never flips, Shift keeps the proportions). */
function scaleOf(drag: Drag) {
  const { anchor, corner, now } = drag;
  if (!anchor || !corner) return { sx: 1, sy: 1 };
  const fx = corner.x - anchor.x || 1;
  const fy = corner.y - anchor.y || 1;
  let sx = Math.max(0.05, (now.x - anchor.x) / fx);
  let sy = Math.max(0.05, (now.y - anchor.y) / fy);
  if (drag.shift) sx = sy = Math.max(sx, sy);
  return { sx, sy };
}

/** Where the points of a selected stroke are during a move or resize. */
function draggedPoints(points: readonly number[], drag: Drag) {
  if (drag.mode === 'move')
    return translatePoints(points, drag.now.x - drag.start.x, drag.now.y - drag.start.y);
  if (drag.mode === 'scale' && drag.anchor) {
    const { sx, sy } = scaleOf(drag);
    return scalePoints(points, drag.anchor.x, drag.anchor.y, sx, sy);
  }
  return points;
}

const marqueeBox = (d: Drag): Bounds => ({
  x0: Math.min(d.start.x, d.now.x),
  y0: Math.min(d.start.y, d.now.y),
  x1: Math.max(d.start.x, d.now.x),
  y1: Math.max(d.start.y, d.now.y),
});

export interface SketchSheetProps {
  /** Remount the sheet when the model changes (key={model}): state starts clean. */
  model: SketchModel;
  team: boolean;
  ref?: Ref<SketchSheetHandle>;
}

export function SketchSheet({ model, team, ref }: SketchSheetProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brushRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const scale = size.w / SHEET.width;
  const t = useT();

  const tool = useSketch((s) => s.tool);
  const color = useSketch((s) => s.color);
  const sizeStep = useSketch((s) => s.sizeStep);
  const noteColor = useSketch((s) => s.noteColor);
  const fill = useSketch((s) => s.fill);
  const dash = useSketch((s) => s.dash);
  const rough = useSketch((s) => s.rough);
  const icon = useSketch((s) => s.icon);
  const selection = useSketch((s) => s.selection);
  const theme = useThemeController((s) => s.resolved);
  const snapshot = useSketchSnapshot();
  const peers = useCollab((s) => s.peers);

  // Mutable drawing state: read by the frame loop, never triggers renders.
  const live = useRef<LiveStroke | null>(null);
  const erasing = useRef(false);
  const strokesRef = useRef(snapshot.strokes);
  const paletteRef = useRef<Palette | null>(null);
  const painted = useRef(new WeakMap<Stroke, Painted>());
  const frame = useRef(0);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const trails = useRef(new Map<string, Trail>());
  const lasering = useRef(false);
  const toolRef = useRef(tool);
  const selRef = useRef<ReadonlySet<string>>(new Set(selection));
  const drag = useRef<Drag | null>(null);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  /** Select tool: the pointer is over something it can grab. */
  const [grabbable, setGrabbable] = useState(false);

  // Notes that exist when the sheet opens do not play the "stick" animation.
  const [known] = useState(() => new Set(model.getSnapshot().notes.map((n) => n.id)));
  const [focusId, setFocusId] = useState<string | null>(null);

  // --- fit the 16:10 sheet into the available space ---------------------------
  useLayoutEffect(() => {
    const frameEl = frameRef.current!;
    // Layout size (contentRect), not getBoundingClientRect: the dialog opens with
    // a scale animation, and a transformed size would leave the sheet too small.
    const fit = ([entry]: ResizeObserverEntry[]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const w = Math.floor(Math.min(width, height * ASPECT));
      setSize({ w, h: Math.floor(w / ASPECT) });
    };
    // The observer also fires once right away with the initial size.
    const observer = new ResizeObserver(fit);
    observer.observe(frameEl);
    return () => observer.disconnect();
  }, []);

  /** Strokes selected right now (the selection may name strokes a teammate erased). */
  const selectedStrokes = () => strokesRef.current.filter((s) => selRef.current.has(s.id));

  /** Frame around the selection, during a move or resize included. */
  const selectionFrame = (): Bounds | null => {
    const d = drag.current;
    const list = selectedStrokes().map((s) =>
      d && d.mode !== 'marquee' ? { ...s, points: draggedPoints(s.points, d) } : s,
    );
    const b = unionBounds(list);
    return (
      b && {
        x0: b.x0 - FRAME_PAD,
        y0: b.y0 - FRAME_PAD,
        x1: b.x1 + FRAME_PAD,
        y1: b.y1 + FRAME_PAD,
      }
    );
  };

  // --- painting --------------------------------------------------------------
  // Named so a frame can schedule the next one while laser trails fade.
  const paint = useCallback(function paintFrame() {
    frame.current = 0;
    const canvas = canvasRef.current;
    // desynchronized: lower-latency canvas, ink appears closer to the pointer.
    const ctx = canvas?.getContext('2d', { desynchronized: true });
    if (!canvas || !ctx) return;
    const palette = (paletteRef.current ??= readPalette(sheetRef.current!));
    const k = canvas.width / SHEET.width;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const current = live.current;
    const d = drag.current;
    const moving = d && d.mode !== 'marquee';
    for (const stroke of strokesRef.current) {
      if (current && stroke.id === current.stroke.id) continue; // drawn from the local copy
      if (moving && selRef.current.has(stroke.id)) {
        // Moving or resizing: drawn where it will land (not cached, it changes every frame).
        const preview = paintOf({ ...stroke, points: draggedPoints(stroke.points, d) });
        drawPainted(ctx, preview, palette[stroke.color], palette.paper);
        continue;
      }
      let look = painted.current.get(stroke);
      if (!look) {
        look = paintOf(stroke);
        painted.current.set(stroke, look);
      }
      drawPainted(ctx, look, palette[stroke.color], palette.paper);
    }
    if (current && (current.begun || isFreehand(current.stroke.tool))) {
      drawPainted(
        ctx,
        paintOf(current.stroke, false),
        palette[current.stroke.color],
        palette.paper,
      );
    }

    // Selection: a dashed frame with a square handle on each corner.
    if (toolRef.current === 'select' && selRef.current.size) {
      const b = selectionFrame();
      if (b) {
        const s = 1 / Math.max(scaleRef.current, 0.01);
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 1.5 * s;
        ctx.setLineDash([6 * s, 4 * s]);
        ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
        ctx.setLineDash([]);
        const h = HANDLE_PX * s;
        for (const [x, y] of [
          [b.x0, b.y0],
          [b.x1, b.y0],
          [b.x0, b.y1],
          [b.x1, b.y1],
        ] as const) {
          ctx.fillStyle = palette.paper;
          ctx.fillRect(x - h, y - h, h * 2, h * 2);
          ctx.strokeRect(x - h, y - h, h * 2, h * 2);
        }
      }
    }
    if (d?.mode === 'marquee') {
      const b = marqueeBox(d);
      ctx.fillStyle = palette.accent;
      ctx.globalAlpha = 0.08;
      ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 1 / Math.max(scaleRef.current, 0.01);
      ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    }

    // Laser trails: a glowing line that tapers off toward its tail.
    const now = performance.now();
    for (const [key, trail] of trails.current) {
      trail.pts = trail.pts.filter((pt) => now - pt.t < LASER_FADE_MS);
      if (trail.pts.length === 0) {
        trails.current.delete(key);
        continue;
      }
      const pts = trail.pts.map((pt) => ({
        x: pt.x,
        y: pt.y,
        life: 1 - (now - pt.t) / LASER_FADE_MS,
      }));
      ctx.fillStyle = trail.color;
      if (pts.length > 1) {
        ctx.globalAlpha = 0.22;
        ctx.fill(laserPath(pts, 24));
        ctx.globalAlpha = 1;
        ctx.fill(laserPath(pts, 9));
      }
      const head = pts[pts.length - 1]!;
      ctx.globalAlpha = head.life;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (trails.current.size > 0) frame.current = requestAnimationFrame(paintFrame);
    // The frame helpers read refs only, so the painter itself never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestPaint = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(paint);
  }, [paint]);

  useEffect(() => {
    strokesRef.current = snapshot.strokes;
    requestPaint();
  }, [snapshot.strokes, requestPaint]);

  useEffect(() => {
    toolRef.current = tool;
    selRef.current = new Set(selection);
    requestPaint();
  }, [tool, selection, requestPaint]);

  // Crisp on HiDPI screens: the backing store follows devicePixelRatio.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.w) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    paint();
  }, [size, paint]);

  // Theme switch: ink colors are re-read from CSS.
  useEffect(() => {
    paletteRef.current = null;
    requestPaint();
  }, [theme, requestPaint]);

  // Step numbers are drawn in the hand-written font: repaint once it arrives.
  useEffect(() => {
    void document.fonts?.load('600 40px "Shantell Sans"').then(() => requestPaint());
  }, [requestPaint]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const pushTrail = useCallback(
    (key: string, trailColor: string, x: number, y: number) => {
      let trail = trails.current.get(key);
      if (!trail) trails.current.set(key, (trail = { color: trailColor, pts: [] }));
      trail.pts.push({ x, y, t: performance.now() });
      requestPaint();
    },
    [requestPaint],
  );

  // Teammates' laser pointers arrive with their presence (about 20 per second).
  useEffect(() => {
    for (const [id, peer] of Object.entries(peers)) {
      if (peer.pen?.laser) pushTrail(id, peer.color, peer.pen.x, peer.pen.y);
    }
  }, [peers, pushTrail]);

  /** Picks up model changes right away (no flicker waiting for the React render). */
  const syncStrokes = () => {
    strokesRef.current = model.getSnapshot().strokes;
  };

  const select = (ids: readonly string[]) => {
    selRef.current = new Set(ids);
    useSketch.getState().setSelection(ids);
    requestPaint();
  };

  // The pixel cursor reads data-cursor when the pointer enters an element:
  // tell it the select cursor changed while the pointer stays on the canvas.
  const cursor = tool === 'select' ? (grabbable ? 'grab' : 'default') : 'none';
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas?.matches(':hover'))
      canvas.dispatchEvent(new globalThis.PointerEvent('pointerover', { bubbles: true }));
  }, [cursor]);

  // --- notes -----------------------------------------------------------------
  const placeNote = useCallback(
    (kind: Note['kind'], x: number, y: number) => {
      const { name, color: authorColor } = useIdentity.getState();
      const { noteColor: paper, color: ink, sizeStep: step } = useSketch.getState();
      const id = newId();
      const w = kind === 'note' ? NOTE_SIZE.width : 160;
      const textSize = TEXT_SIZES[step];
      model.addNote({
        id,
        kind,
        // Centered under the pointer (notes) or starting at it (text).
        x: Math.round(Math.max(0, Math.min(SHEET.width - w, kind === 'note' ? x - w / 2 : x))),
        y: Math.round(
          Math.max(
            0,
            Math.min(
              SHEET.height - (kind === 'note' ? NOTE_SIZE.height : textSize * 1.5),
              y - (kind === 'note' ? 20 : textSize * 0.7),
            ),
          ),
        ),
        text: '',
        color: paper,
        ink: kind === 'text' ? ink : 'ink',
        fontStep: kind === 'text' ? step : 1,
        author: team ? name || t('common.guest') : null,
        authorColor: team ? authorColor : null,
      });
      setFocusId(id);
    },
    [model, team, t],
  );

  const toSheet = useCallback((clientX: number, clientY: number) => {
    const r = sheetRef.current?.getBoundingClientRect();
    if (!r || clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom)
      return null;
    return {
      x: ((clientX - r.left) / r.width) * SHEET.width,
      y: ((clientY - r.top) / r.height) * SHEET.height,
    };
  }, []);

  useImperativeHandle(ref, () => ({ toSheet, placeNote }), [toSheet, placeNote]);

  // --- pointer input -----------------------------------------------------------
  const pointOf = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * SHEET.width,
      y: ((e.clientY - r.top) / r.height) * SHEET.height,
    };
  };

  const moveBrush = (p: { x: number; y: number } | null) => {
    const brush = brushRef.current;
    if (!brush) return;
    if (!p) {
      delete brush.dataset.on;
      return;
    }
    const d = brush.offsetWidth;
    const h = brush.offsetHeight;
    brush.style.transform = `translate3d(${p.x * scale - d / 2}px, ${p.y * scale - h / 2}px, 0)`;
    brush.dataset.on = '';
  };

  const eraseAt = (p: { x: number; y: number }) => {
    const hit = new Set<string>();
    for (const s of strokesRef.current) if (hitsStroke(s, p.x, p.y, ERASER_RADIUS)) hit.add(s.id);
    if (hit.size) {
      model.removeStrokes(hit);
      syncStrokes();
      requestPaint();
      crumbs(sheetRef.current, p.x * scale, p.y * scale);
    }
  };

  /** The corner handle under the point, with the opposite corner as anchor. */
  const handleAt = (p: { x: number; y: number }) => {
    const b = selectionFrame();
    if (!b) return null;
    const reach = (HANDLE_PX + 3) / Math.max(scale, 0.01);
    for (const [cx, cy, ax, ay] of [
      [b.x0, b.y0, b.x1, b.y1],
      [b.x1, b.y0, b.x0, b.y1],
      [b.x0, b.y1, b.x1, b.y0],
      [b.x1, b.y1, b.x0, b.y0],
    ] as const) {
      if (Math.abs(p.x - cx) <= reach && Math.abs(p.y - cy) <= reach)
        return { corner: { x: cx, y: cy }, anchor: { x: ax, y: ay } };
    }
    return null;
  };

  const pickRadius = () => PICK_PX / Math.max(scale, 0.01);

  /** Select tool: a press picks a resize handle, a stroke, or starts a selection box. */
  const beginSelect = (p: { x: number; y: number }, shift: boolean) => {
    const sel = selRef.current;
    if (sel.size) {
      const handle = handleAt(p);
      if (handle) {
        drag.current = { mode: 'scale', start: p, now: p, shift, ...handle };
        return;
      }
    }
    const hit = strokeAt(strokesRef.current, p.x, p.y, pickRadius());
    if (hit) {
      if (shift) {
        // Shift toggles a stroke in or out of the selection.
        select(sel.has(hit.id) ? [...sel].filter((id) => id !== hit.id) : [...sel, hit.id]);
        if (!sel.has(hit.id)) drag.current = { mode: 'move', start: p, now: p, shift };
        return;
      }
      if (!sel.has(hit.id)) select([hit.id]);
      drag.current = { mode: 'move', start: p, now: p, shift };
      return;
    }
    // Between the strokes of a selection still moves it (it is one thing).
    const frameBox = sel.size ? selectionFrame() : null;
    if (frameBox && contains(frameBox, { x0: p.x, y0: p.y, x1: p.x, y1: p.y }) && !shift) {
      drag.current = { mode: 'move', start: p, now: p, shift };
      return;
    }
    if (!shift && sel.size) select([]);
    drag.current = { mode: 'marquee', start: p, now: p, shift, base: shift ? [...sel] : [] };
  };

  const endSelect = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.mode === 'marquee') {
      const box = marqueeBox(d);
      const inside = strokesRef.current.filter((s) => contains(box, bounds(s))).map((s) => s.id);
      select([...new Set([...(d.base ?? []), ...inside])]);
      return;
    }
    const moved = Math.hypot(d.now.x - d.start.x, d.now.y - d.start.y) >= 1;
    if (moved) {
      model.setStrokePoints(
        new Map(selectedStrokes().map((s) => [s.id, draggedPoints(s.points, d)] as const)),
      );
      syncStrokes();
    }
    requestPaint();
  };

  /** A numbered step goes where the pointer is, with the next number. */
  const placeStep = (p: { x: number; y: number }) => {
    const d = STEP_SIZES[sizeStep];
    model.addStrokes([
      {
        id: newId(),
        tool: 'step',
        color,
        size: SIZE_STEPS[sizeStep],
        points: [snap(p.x - d / 2), snap(p.y - d / 2), snap(p.x + d / 2), snap(p.y + d / 2)],
        fill: 'solid',
        dash: 'solid',
        rough,
        seed: newSeed(),
        label: String(nextStep(strokesRef.current)),
      },
    ]);
    syncStrokes();
    requestPaint();
  };

  const flush = () => {
    clearTimeout(flushTimer.current);
    flushTimer.current = undefined;
    const current = live.current;
    if (!current?.begun) return;
    if (isFreehand(current.stroke.tool)) {
      model.appendPoints(current.stroke.id, current.pending);
      current.pending = [];
    } else {
      model.setPoints(current.stroke.id, current.stroke.points);
    }
  };
  const flushSoon = () => {
    flushTimer.current ??= setTimeout(flush, FLUSH_MS);
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const eraseButton = e.button === 2 || (e.buttons & 32) !== 0;
    if (e.pointerType === 'mouse' && e.button !== 0 && !eraseButton) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    // Typing in a note and clicking the paper only leaves the note (no stray ink).
    const active = document.activeElement;
    if (active instanceof HTMLTextAreaElement) {
      active.blur();
      return;
    }
    const p = pointOf(e);

    if (tool === 'laser') {
      lasering.current = true;
      pushTrail('me', LASER_COLOR, p.x, p.y);
      if (team)
        useCollab.getState().setPen({ x: Math.round(p.x), y: Math.round(p.y), laser: true });
      return;
    }
    if (tool === 'eraser' || eraseButton) {
      erasing.current = true;
      model.stopCapturing();
      eraseAt(p);
      return;
    }
    if (tool === 'note' || tool === 'text') {
      placeNote(tool, p.x, p.y);
      return;
    }
    if (tool === 'select') {
      beginSelect(p, e.shiftKey);
      requestPaint();
      return;
    }
    if (tool === 'step') {
      placeStep(p);
      return;
    }
    const x = snap(p.x);
    const y = snap(p.y);
    const freehand = isFreehand(tool);
    const stroke: LiveStroke['stroke'] = {
      id: newId(),
      tool,
      color,
      size: SIZE_STEPS[sizeStep],
      points: freehand ? [x, y] : [x, y, x, y],
      fill: isClosed(tool) ? fill : 'none',
      dash: freehand || tool === 'icon' ? 'solid' : dash,
      rough,
      seed: newSeed(),
      ...(tool === 'icon' ? { icon } : {}),
    };
    live.current = { stroke, pending: [], pos: p, start: { x, y }, begun: freehand };
    if (freehand) model.beginStroke(stroke);
    requestPaint();
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = pointOf(e);
    moveBrush(p);
    if (team)
      useCollab
        .getState()
        .setPen({ x: Math.round(p.x), y: Math.round(p.y), laser: lasering.current });

    if (lasering.current) {
      for (const ev of samplesOf(e.nativeEvent)) {
        const q = pointOf(ev);
        pushTrail('me', LASER_COLOR, q.x, q.y);
      }
      return;
    }
    if (erasing.current) {
      for (const ev of samplesOf(e.nativeEvent)) eraseAt(pointOf(ev));
      return;
    }
    if (tool === 'select') {
      const d = drag.current;
      if (d) {
        d.now = p;
        d.shift = e.shiftKey;
        requestPaint();
        return;
      }
      const over =
        (selRef.current.size > 0 && handleAt(p) !== null) ||
        strokeAt(strokesRef.current, p.x, p.y, pickRadius()) !== null;
      if (over !== grabbable) setGrabbable(over);
      return;
    }

    const current = live.current;
    if (!current) return;

    if (isFreehand(current.stroke.tool)) {
      // A stylus is already precise: smooth it less than a mouse.
      const amount = e.pointerType === 'pen' ? 0.15 : current.stroke.tool === 'marker' ? 0.45 : 0.3;
      const pts = current.stroke.points;
      for (const ev of samplesOf(e.nativeEvent)) {
        current.pos = smoothTowards(current.pos, pointOf(ev), amount);
        const x = snap(current.pos.x);
        const y = snap(current.pos.y);
        const lx = pts[pts.length - 2]!;
        const ly = pts[pts.length - 1]!;
        if (Math.hypot(x - lx, y - ly) < MIN_STEP) continue;
        pts.push(x, y);
        current.pending.push(x, y);
      }
    } else {
      let end = { x: p.x, y: p.y };
      if (e.shiftKey)
        end = constrainEnd(current.stroke.tool, current.start.x, current.start.y, p.x, p.y);
      if (!current.begun) {
        if (Math.hypot(end.x - current.start.x, end.y - current.start.y) < SHAPE_SLOP) return;
        current.begun = true;
        model.beginStroke(current.stroke);
      }
      current.stroke.points = [current.start.x, current.start.y, snap(end.x), snap(end.y)];
    }
    flushSoon();
    requestPaint();
  };

  const finish = (e: PointerEvent<HTMLCanvasElement>) => {
    erasing.current = false;
    if (lasering.current) {
      lasering.current = false;
      const p = pointOf(e);
      if (team) useCollab.getState().setPen({ x: Math.round(p.x), y: Math.round(p.y) });
    }
    if (drag.current) {
      endSelect();
      return;
    }
    const current = live.current;
    if (!current) return;
    if (current.stroke.tool === 'icon' && !current.begun) {
      live.current = null;
      // A click places the icon at its default size, centered on the pointer.
      const s = ICON_SIZES[sizeStep];
      const { x, y } = current.start;
      model.addStrokes([
        {
          ...current.stroke,
          points: [snap(x - s / 2), snap(y - s / 2), snap(x + s / 2), snap(y + s / 2)],
        },
      ]);
      syncStrokes();
      requestPaint();
      return;
    }
    if (isFreehand(current.stroke.tool)) {
      // Let the ink catch up with the pointer exactly where it was released.
      const p = pointOf(e);
      const pts = current.stroke.points;
      if (pts.length > 2 || Math.hypot(p.x - pts[0]!, p.y - pts[1]!) > MIN_STEP) {
        current.stroke.points.push(snap(p.x), snap(p.y));
        current.pending.push(snap(p.x), snap(p.y));
      }
    }
    flush();
    live.current = null;
    if (current.begun) model.endStroke(current.stroke.id);
    syncStrokes();
    requestPaint();
  };

  const onPointerLeave = () => {
    moveBrush(null);
    if (team) useCollab.getState().setPen(null);
  };

  // Who is typing in which note (first teammate wins if two type in the same one).
  const editors = new Map<string, { name: string; color: string }>();
  for (const peer of Object.values(peers)) {
    if (peer.editingNote && !editors.has(peer.editingNote))
      editors.set(peer.editingNote, { name: peer.name, color: peer.color });
  }

  // --- pointer preview look ------------------------------------------------------
  const brushKind =
    tool === 'pen' || tool === 'marker'
      ? 'draw'
      : tool === 'line' ||
          tool === 'arrow' ||
          tool === 'rect' ||
          tool === 'diamond' ||
          tool === 'ellipse'
        ? 'cross'
        : tool;
  const width = SIZE_STEPS[sizeStep] * (tool === 'marker' ? 3 : 1.6);
  const brushPx =
    brushKind === 'laser'
      ? 12
      : brushKind === 'eraser'
        ? ERASER_RADIUS * 2 * scale
        : brushKind === 'note'
          ? NOTE_SIZE.width * scale * 0.5
          : brushKind === 'text'
            ? TEXT_SIZES[sizeStep] * scale
            : brushKind === 'icon'
              ? ICON_SIZES[sizeStep] * scale
              : brushKind === 'step'
                ? STEP_SIZES[sizeStep] * scale
                : brushKind === 'cross'
                  ? 22
                  : Math.max(6, width * scale);

  return (
    <div ref={frameRef} className="grid min-h-0 flex-1 animate-page-in place-items-center">
      <div
        ref={sheetRef}
        className="sk-sheet"
        style={
          {
            width: size.w,
            height: size.h,
            '--sk-cell': `${CELL * scale}px`,
          } as CSSProperties
        }
      >
        <canvas
          ref={canvasRef}
          className="sk-canvas"
          data-cursor={cursor}
          aria-label={t('sketch.canvas')}
          role="img"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finish}
          onPointerCancel={finish}
          onPointerLeave={onPointerLeave}
          onContextMenu={(e) => e.preventDefault()}
        />
        {brushKind !== 'select' && (
          <div
            ref={brushRef}
            className="sk-brush"
            data-kind={brushKind}
            style={
              {
                width: brushPx,
                height:
                  brushKind === 'note' ? brushPx * (NOTE_SIZE.height / NOTE_SIZE.width) : brushPx,
                '--sk-color': `var(--sk-${color})`,
                '--note-bg': `var(--note-${noteColor})`,
                fontSize: brushKind === 'step' ? brushPx * 0.56 : undefined,
              } as CSSProperties
            }
          >
            {brushKind === 'icon' && <IconGlyph id={icon} size={brushPx} />}
            {brushKind === 'step' && nextStep(snapshot.strokes)}
          </div>
        )}
        <div
          className="sk-layer"
          style={{ width: SHEET.width, height: SHEET.height, transform: `scale(${scale})` }}
        >
          {snapshot.notes.map((note) => (
            <StickyNote
              key={note.id}
              note={note}
              model={model}
              scale={scale}
              fresh={!known.has(note.id)}
              autoFocus={note.id === focusId}
              team={team}
              editor={editors.get(note.id) ?? null}
            />
          ))}
          {team &&
            Object.entries(peers).map(([id, peer]) =>
              peer.pen ? (
                <div
                  key={id}
                  className="sk-peer"
                  data-laser={peer.pen.laser ? '' : undefined}
                  style={{ transform: `translate(${peer.pen.x}px, ${peer.pen.y}px)` }}
                >
                  <div
                    style={{
                      transform: `scale(${1 / Math.max(scale, 0.01)})`,
                      transformOrigin: '0 0',
                    }}
                  >
                    <TintedArrow color={peer.color} />
                    <span
                      className="mt-0.5 ml-3 inline-block rounded-md px-1.5 py-0.5 text-[11px] whitespace-nowrap text-white shadow-card"
                      style={{ background: peer.color }}
                    >
                      {peer.name}
                    </span>
                  </div>
                </div>
              ) : null,
            )}
        </div>
      </div>
    </div>
  );
}

/** A few specks flying off where ink was rubbed out. */
function crumbs(sheet: HTMLElement | null, x: number, y: number) {
  if (!sheet || isMotionLite()) return;
  for (let i = 0; i < 3; i++) {
    const el = document.createElement('span');
    el.className = 'sk-crumb';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    sheet.appendChild(el);
    const a = Math.random() * Math.PI * 2;
    const d = 10 + Math.random() * 14;
    el.animate(
      [
        { transform: 'translate(-2px, -2px)', opacity: 0.9 },
        { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d + 8}px)`, opacity: 0 },
      ],
      { duration: 320, easing: 'steps(4, end)' },
    ).onfinish = () => el.remove();
  }
}
