/**
 * Board templates — the "easy door" into DuckBord.
 *
 * A template is plain data (columns, labels, a few example cards), so adding
 * one is a data change only. Example cards teach the tool by example
 * ("drag me", "open me") instead of a tutorial.
 *
 * The content is written per language (`locales/`) and comes with the
 * language pack (i18n): a board is created in the language in use.
 */
import {
  addNewCard,
  createBoard,
  createCard,
  type Board,
  type BoardMode,
  type BoardSkin,
  type Profile,
} from '@devbord/shared';
import { useLocale } from '../i18n';
import { inDays, type BoardTemplate } from './model';

export type { BoardTemplate } from './model';

/** The templates of the language in use. */
const current = () => useLocale.getState().templates;

/**
 * Templates for a profile, plus those offered to everybody (content creators,
 * blank). Seasonal looks are not templates: they are the "Tema" picked below
 * the templates.
 */
export const templatesFor = (profile: Profile) =>
  current().filter((t) => t.profile === profile || t.everyone);

export const getTemplate = (id: string) => current().find((t) => t.id === id);

/**
 * Builds a ready-to-use board from a template.
 * The board's profile comes from the user's choice, so "En blanco" works for both.
 */
export function buildBoardFromTemplate(
  template: BoardTemplate,
  options: { name?: string; profile?: Profile; mode?: BoardMode; skin?: BoardSkin } = {},
): Board {
  let board = createBoard({
    name: options.name?.trim() || template.name,
    profile: template.lockedProfile ? template.profile : (options.profile ?? template.profile),
    mode: options.mode,
    skin: options.skin,
    templateId: template.id,
    columnTitles: template.columns,
    wipLimits: template.wipLimits,
    columnDescriptions: template.columnDescriptions,
    labels: template.labels,
    cardTemplate: template.cardTemplate ?? null,
  });

  const labelId = new Map(board.labels.map((l) => [l.name, l.id]));
  for (const seed of template.cards) {
    const column = board.columns[seed.column];
    if (!column) continue;
    const labelIds = (seed.labels ?? []).flatMap((name) => labelId.get(name) ?? []);
    const dueDate = seed.dueInDays === undefined ? seed.patch?.dueDate : inDays(seed.dueInDays);
    board = addNewCard(
      board,
      column.id,
      createCard(seed.title, { ...seed.patch, labelIds, ...(dueDate ? { dueDate } : {}) }),
    );
  }
  return board;
}
