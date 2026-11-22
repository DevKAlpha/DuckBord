/** Display metadata (wording + color) for card enums. Pure presentation. */
import type { CardType, LabelColor, Priority } from '@devbord/shared';
import { dateFormat, type MessageKey } from '../../i18n';

/** `label` is a text key: show it with `t(meta.label)`. */
export const CARD_TYPE_META: Record<CardType, { label: MessageKey; color: LabelColor }> = {
  task: { label: 'card.type.task', color: 'gray' },
  feature: { label: 'card.type.feature', color: 'purple' },
  bug: { label: 'card.type.bug', color: 'red' },
};

export const PRIORITY_META: Record<Priority, { label: MessageKey; color: LabelColor }> = {
  low: { label: 'card.priority.low', color: 'green' },
  medium: { label: 'card.priority.medium', color: 'yellow' },
  high: { label: 'card.priority.high', color: 'orange' },
};

/**
 * Formats a YYYY-MM-DD due date and reports whether it is overdue.
 * The date is parsed as local midnight: due dates are calendar days, not instants.
 */
export function describeDueDate(dueDate: string, today = new Date()) {
  const [y, m, d] = dueDate.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return {
    text: dateFormat({ day: 'numeric', month: 'short' }).format(date),
    overdue: date < startOfToday,
  };
}

/**
 * Plain-text preview of a Markdown description (user stories use `**bold**`,
 * `###` headings and ```gherkin fences). Keeps the card face calm: just words.
 */
export function previewText(markdown: string): string {
  return markdown
    .split('\n')
    .filter((line) => !line.trim().startsWith('```'))
    .map((line) =>
      line
        .replace(/^\s*#{1,6}\s*/, '')
        .replace(/^\s*[*-]\s+/, '')
        .replace(/\*\*(.+?)\*\*/g, '$1'),
    )
    .filter((line) => line.trim())
    .join(' · ');
}

/**
 * How cards and columns make room while one is dragged over them: 3 quick
 * sprite steps (dnd-kit's default 200ms ease felt sluggish).
 */
export const SHIFT = { duration: 120, easing: 'steps(3, end)' };
