/**
 * One whiteboard icon as a small SVG: the icon picker and the placement
 * preview. Same drawing as on the canvas, without the hand-made wobble.
 */
import type { IconId } from '../../controllers/sketchController';
import { ICONS } from './icons';

export function IconGlyph({ id, size = 24 }: { id: IconId; size?: number }) {
  return (
    <svg
      viewBox="-1 -1 26 26"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONS[id].map((part, i) =>
        'p' in part ? (
          <path key={i} d={part.p} />
        ) : 'c' in part ? (
          <circle key={i} cx={part.c[0]} cy={part.c[1]} r={part.c[2]} />
        ) : 'e' in part ? (
          <ellipse key={i} cx={part.e[0]} cy={part.e[1]} rx={part.e[2] / 2} ry={part.e[3] / 2} />
        ) : (
          <rect key={i} x={part.r[0]} y={part.r[1]} width={part.r[2]} height={part.r[3]} rx={1} />
        ),
      )}
    </svg>
  );
}
