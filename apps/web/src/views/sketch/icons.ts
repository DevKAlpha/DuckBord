/**
 * DuckBord's whiteboard icons (story 24): simple line drawings in a 24×24 box,
 * drawn with the same hand-made stroke as the shapes (render.ts), so an icon
 * looks like part of the sketch, not a sticker.
 *
 * Each icon is a list of primitives. Paths use only absolute M, L, Q, C and Z
 * commands, so they can be scaled by multiplying every coordinate pair.
 * A tiny segment ("M x y L x+0.3 y") is a dot: round caps draw it.
 */
import type { IconId } from '../../controllers/sketchController';

export type IconPart =
  | { p: string }
  /** Circle: center and radius. */
  | { c: readonly [number, number, number] }
  /** Ellipse: center, width and height. */
  | { e: readonly [number, number, number, number] }
  /** Rectangle: corner, width and height. */
  | { r: readonly [number, number, number, number] };

/** Five-pointed star around (12, 12.5). */
const STAR = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 10.5 : 4.4;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(12 + Math.cos(a) * r).toFixed(2)} ${(12.8 + Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
})();

export const ICONS: Record<IconId, readonly IconPart[]> = {
  duck: [
    { p: 'M3 13 Q4 20.5 12 20.5 Q19.5 20.5 20.8 14 Q17.5 13.6 14.8 12 Q9 13.6 3 13 Z' },
    { c: [15, 8, 4] },
    { p: 'M19 7.4 L22.6 8.8 L19 10.2' },
    { p: 'M15.6 6.9 L15.9 6.9' },
    { p: 'M7 15.5 Q10 18 13 15.5' },
  ],
  check: [{ p: 'M4 12.5 L9.5 18 L20 6' }],
  cross: [{ p: 'M5 5 L19 19 M19 5 L5 19' }],
  star: [{ p: STAR }],
  heart: [
    {
      p: 'M12 20.5 C5 15.5 2.5 11 4.5 7.5 C6.5 4 10.5 4.5 12 7.5 C13.5 4.5 17.5 4 19.5 7.5 C21.5 11 19 15.5 12 20.5 Z',
    },
  ],
  warning: [{ p: 'M12 3 L22 20.5 L2 20.5 Z' }, { p: 'M12 9 L12 14.5 M12 17.6 L12 17.9' }],
  question: [
    { p: 'M8 8.5 Q8 4 12 4 Q16 4 16 8 Q16 10.5 13.5 11.5 Q12 12.2 12 14.5' },
    { p: 'M12 18.6 L12 18.9' },
  ],
  idea: [
    { p: 'M9 15.5 Q5.5 13 5.5 9.5 Q5.5 3 12 3 Q18.5 3 18.5 9.5 Q18.5 13 15 15.5 L15 18 L9 18 Z' },
    { p: 'M10 21 L14 21' },
  ],
  flag: [{ p: 'M5 22 L5 3' }, { p: 'M5 4 Q9 2 12 4 Q15 6 19 4 L19 13 Q15 15 12 13 Q9 11 5 13' }],
  clock: [{ c: [12, 12, 9.5] }, { p: 'M12 6.5 L12 12 L16 14.5' }],
  target: [{ c: [12, 12, 9.5] }, { c: [12, 12, 5.5] }, { p: 'M12 11.9 L12.3 11.9' }],
  fire: [
    {
      p: 'M12 22 Q5 20.5 5 14.5 Q5 9 10 4 Q10 9 13 10 Q13.5 6.5 16 5 Q19 9.5 19 14.5 Q19 20.5 12 22 Z',
    },
    { p: 'M12 19 Q9.5 18 10 15.5 Q11 13.5 12 12.5 Q13 14.5 14 15.5 Q14.5 18 12 19 Z' },
  ],
  user: [{ c: [12, 8, 4.5] }, { p: 'M3.5 21.5 Q3.5 14 12 14 Q20.5 14 20.5 21.5' }],
  chat: [{ p: 'M3 5 L21 5 L21 16 L11 16 L6 20.5 L7 16 L3 16 Z' }],
  mail: [{ r: [2, 5, 20, 14] }, { p: 'M2 6 L12 13.5 L22 6' }],
  calendar: [{ r: [3, 5, 18, 16] }, { p: 'M3 10 L21 10 M8 3 L8 7 M16 3 L16 7' }],
  document: [
    { p: 'M6 2 L14.5 2 L19 6.5 L19 22 L6 22 Z' },
    { p: 'M14.5 2 L14.5 6.5 L19 6.5 M9 12 L16 12 M9 16 L16 16' },
  ],
  lock: [{ r: [5, 11, 14, 10] }, { p: 'M8 11 L8 7.5 Q8 3 12 3 Q16 3 16 7.5 L16 11 M12 15 L12 17' }],
  bug: [
    { e: [12, 14.5, 9, 11] },
    { c: [12, 6.5, 2.5] },
    {
      p: 'M12 9.5 L12 20 M7.6 12 L3.5 10 M7.5 15 L3 15 M8 18 L4.5 20.5 M16.4 12 L20.5 10 M16.5 15 L21 15 M16 18 L19.5 20.5',
    },
  ],
  laptop: [{ r: [4, 4, 16, 11] }, { p: 'M1.5 19.5 L22.5 19.5 L20 15 L4 15 Z' }],
  phone: [{ r: [7, 2, 10, 20] }, { p: 'M11 18.5 L13 18.5' }],
  server: [
    { r: [3, 3, 18, 7.5] },
    { r: [3, 13.5, 18, 7.5] },
    { p: 'M7 6.75 L7.3 6.75 M7 17.25 L7.3 17.25 M11 6.75 L17 6.75 M11 17.25 L17 17.25' },
  ],
  database: [
    { e: [12, 5.5, 16, 5] },
    { p: 'M4 5.5 L4 18.5 Q4 21.5 12 21.5 Q20 21.5 20 18.5 L20 5.5 M4 12 Q4 15 12 15 Q20 15 20 12' },
  ],
  cloud: [
    {
      p: 'M7 19 Q2 19 2 14.5 Q2 10.5 6.5 10.5 Q7 5 12.5 5 Q17.5 5 18.5 10 Q22 10.5 22 14.5 Q22 19 17.5 19 Z',
    },
  ],
};

/** Scales an icon path from the 24 box to (x, y) with scale `k`. */
export function placePath(d: string, x: number, y: number, k: number) {
  let i = 0;
  return d.replace(/-?\d*\.?\d+/g, (n) => {
    const v = Number(n) * k + (i++ % 2 === 0 ? x : y);
    return String(Math.round(v * 100) / 100);
  });
}
