/**
 * Column "kind": what a column means in the flow, guessed from its title
 * (Spanish, English and Korean), so ANY board gets the right status color and
 * decoration, including boards created before this existed.
 */
import type { LabelColor } from '@devbord/shared';

export type ColumnKind =
  'new' | 'icebox' | 'backlog' | 'sprint' | 'progress' | 'review' | 'done' | 'generic';

/** Order matters: the first match wins ("Sprint Backlog" is sprint, not backlog). */
const RULES: ReadonlyArray<[ColumnKind, RegExp]> = [
  ['icebox', /ice ?box|congelad|nevera|frozen|en pausa|algún día|someday|보류|언젠가/i],
  ['new', /new|nuev|ideas?$|entrada|inbox|triaje|triage|신규|아이디어|분류/i],
  ['sprint', /sprint|to ?do|por hacer|pendiente|^pending$|할 일|할 것/i],
  ['backlog', /backlog/i],
  [
    'progress',
    /progress|en curso|haciendo|doing|en marcha|estudiando|studying|underway|wip|진행|하는 중|처리 중|공부 중|적용/i,
  ],
  ['review', /review|revisi|qa\b|verifica|repasar|test|검토|리뷰|검증|복습/i],
  [
    'done',
    /done|hecho|terminad|resuelto|aprobado|^listo$|complet|cerrad|resolved|closed|passed|완료|해결|종료|합격|게시됨/i,
  ],
];

export function columnKind(title: string, isLastColumn = false): ColumnKind {
  for (const [kind, re] of RULES) if (re.test(title)) return kind;
  return isLastColumn ? 'done' : 'generic';
}

/** Status color per kind, following the GitHub Projects board palette. */
export const KIND_COLOR: Record<ColumnKind, LabelColor> = {
  new: 'green',
  icebox: 'blue',
  backlog: 'red',
  sprint: 'red',
  progress: 'yellow',
  review: 'purple',
  done: 'orange',
  generic: 'gray',
};
