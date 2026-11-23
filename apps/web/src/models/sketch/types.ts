/**
 * Whiteboard types and constants. Kept free of Yjs so the main bundle can
 * import them (the model itself is loaded on demand).
 */
/** Logical sheet size. Every client scales it to fit, so drawings line up for everyone. */
export const SHEET = { width: 1600, height: 1000 } as const;

/**
 * Everything drawn on the canvas is a "stroke" (one item of the drawing):
 * - pen, marker: freehand, `points` is the whole polyline;
 * - line, arrow: `points` is start and end;
 * - rect, diamond, ellipse, icon, step: `points` are two opposite corners of the box.
 */
export const STROKE_TOOLS = [
  'pen',
  'marker',
  'line',
  'arrow',
  'rect',
  'diamond',
  'ellipse',
  'icon',
  'step',
] as const;
export type StrokeTool = (typeof STROKE_TOOLS)[number];

/** Ink colors are names, not hex: each client paints them with its own theme. */
export const INK_COLORS = ['ink', 'blue', 'red', 'green', 'orange', 'purple'] as const;
export type InkColor = (typeof INK_COLORS)[number];

/** Inside of closed shapes: empty, hand-drawn hatching, or a soft solid tint. */
export const FILL_STYLES = ['none', 'hachure', 'solid'] as const;
export type FillStyle = (typeof FILL_STYLES)[number];

export const LINE_STYLES = ['solid', 'dashed', 'dotted'] as const;
export type LineStyle = (typeof LINE_STYLES)[number];

/** How hand-drawn the line looks: 0 precise, 1 hand-drawn, 2 sketchy. */
export const ROUGHNESS = [0, 1, 2] as const;
export type Roughness = (typeof ROUGHNESS)[number];

/** DuckBord's own whiteboard icons (drawings in views/sketch/icons.ts). */
export const ICON_IDS = [
  'duck',
  'check',
  'cross',
  'star',
  'heart',
  'warning',
  'question',
  'idea',
  'flag',
  'clock',
  'target',
  'fire',
  'user',
  'chat',
  'mail',
  'calendar',
  'document',
  'lock',
  'bug',
  'laptop',
  'phone',
  'server',
  'database',
  'cloud',
] as const;
export type IconId = (typeof ICON_IDS)[number];

export const NOTE_COLORS = ['yellow', 'pink', 'blue', 'green'] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

export interface Stroke {
  id: string;
  tool: StrokeTool;
  color: InkColor;
  /** Line width in sheet units. */
  size: number;
  /** Flat list [x0, y0, x1, y1, …] in sheet units (see STROKE_TOOLS for the shape). */
  points: readonly number[];
  /** Closed shapes only. */
  fill: FillStyle;
  dash: LineStyle;
  rough: Roughness;
  /**
   * Random seed of the hand-drawn wobble: the same seed draws the same lines,
   * on every screen and after every move, so a shape never "shivers".
   */
  seed: number;
  /** tool "icon": which drawing. */
  icon?: IconId;
  /** tool "step": the number in the circle. */
  label?: string;
  /** Closed shapes: text written inside (centered, wrapped to the shape). */
  text?: string;
}

/** Text sizes of free text on the board (sheet units). */
export const TEXT_SIZES = [28, 40, 60] as const;

export interface Note {
  id: string;
  /** "note" is a sticky note; "text" is free text written straight on the board. */
  kind: 'note' | 'text';
  x: number;
  y: number;
  text: string;
  color: NoteColor;
  /** Free text: ink color and size step (index into TEXT_SIZES). */
  ink: InkColor;
  fontStep: 0 | 1 | 2;
  /** Stacking order: the last touched note is on top. */
  z: number;
  /** Who stuck it (team boards); null on personal boards. */
  author: string | null;
  authorColor: string | null;
}

export interface SketchSnapshot {
  strokes: readonly Stroke[];
  notes: readonly Note[];
  canUndo: boolean;
  canRedo: boolean;
}

export const NOTE_TEXT_MAX = 600;

/** Sticky note paper size (sheet units). */
export const NOTE_SIZE = { width: 300, height: 240 } as const;

/** Id of the first whiteboard of a board (and the only one on team boards). */
export const MAIN_SHEET = 'main';

/** One whiteboard in a board's list. */
export interface SheetInfo {
  id: string;
  name: string;
  createdAt: number;
}

export const SHEET_NAME_MAX = 40;
