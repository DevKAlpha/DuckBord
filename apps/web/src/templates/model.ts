/**
 * Shape of a board template. The content (names, columns, example cards) is
 * written once per language in `locales/`; this file has no words in it.
 */
import type { CardPatch, LabelColor, Profile } from '@devbord/shared';

export interface BoardTemplate {
  id: string;
  profile: Profile;
  name: string;
  description: string;
  columns: string[];
  /** WIP limit per column, aligned with `columns` (null = unlimited). */
  wipLimits?: (number | null)[];
  /** One-line description per column, aligned with `columns`. */
  columnDescriptions?: string[];
  labels: { name: string; color: LabelColor }[];
  /**
   * Offered with both styles (Técnico and Sencillo), not only with `profile`.
   * The board still takes the style the person picked.
   */
  everyone?: boolean;
  /**
   * The board always takes `profile`, whatever style was picked. Picking the
   * template switches the style picker to it, so what is shown is what is made.
   */
  lockedProfile?: boolean;
  /** Description pre-filled in every new card of the board. */
  cardTemplate?: string;
  /**
   * `column` is an index into `columns`; `labels` are label names;
   * `dueInDays` sets the due date relative to the day the board is created.
   */
  cards: {
    column: number;
    title: string;
    labels?: string[];
    patch?: CardPatch;
    dueInDays?: number;
  }[];
}

/**
 * A date `days` from today (YYYY-MM-DD, local), for example due dates that
 * stay meaningful whenever the board is created (SLA due, publish day).
 */
export const inDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
