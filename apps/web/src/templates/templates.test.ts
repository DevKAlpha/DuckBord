import { describe, expect, it } from 'vitest';
import { BoardSchema } from '@devbord/shared';
import { buildBoardFromTemplate, getTemplate, templatesFor, type BoardTemplate } from './index';
import {
  TEMPLATES_ES as TEMPLATES,
  NETWORK_CHANGE_TEMPLATE,
  IT_TICKET_TEMPLATE,
  CONTENT_BRIEF_TEMPLATE,
  USER_STORY_TEMPLATE,
} from './locales/es';
import { TEMPLATES_EN } from './locales/en';
import { TEMPLATES_KO } from './locales/ko';
import { previewText } from '../views/board/cardMeta';

/** Everything but the words: what must be identical in every language. */
const shape = (list: readonly BoardTemplate[]) =>
  list.map((t) => ({
    id: t.id,
    profile: t.profile,
    everyone: t.everyone ?? false,
    lockedProfile: t.lockedProfile ?? false,
    columns: t.columns.length,
    wipLimits: t.wipLimits ?? null,
    columnDescriptions: t.columnDescriptions?.length ?? 0,
    labels: t.labels.map((l) => l.color),
    cardTemplate: Boolean(t.cardTemplate),
    cards: t.cards.map((c) => ({
      column: c.column,
      // Labels by position in the template's label list (names are translated).
      labels: (c.labels ?? []).map((name) => t.labels.findIndex((l) => l.name === name)),
      dueInDays: c.dueInDays ?? null,
      patch: {
        ...c.patch,
        description: c.patch?.description ? 'text' : undefined,
        sprint: c.patch?.sprint ? 'text' : undefined,
      },
    })),
  }));

describe('templates in every language', () => {
  it.each([
    ['en', TEMPLATES_EN],
    ['ko', TEMPLATES_KO],
  ] as const)('%s has the same templates, columns, labels and cards as Spanish', (_l, list) => {
    expect(shape(list)).toEqual(shape(TEMPLATES));
    // Every card label exists in its template (no -1 from a mistyped name).
    for (const t of shape(list)) for (const c of t.cards) expect(c.labels).not.toContain(-1);
  });

  it.each([
    ['en', TEMPLATES_EN],
    ['ko', TEMPLATES_KO],
  ] as const)('%s templates build valid boards', (_l, list) => {
    for (const template of list)
      expect(BoardSchema.safeParse(buildBoardFromTemplate(template)).success).toBe(true);
  });
});

describe('templates', () => {
  it.each(TEMPLATES.map((t) => [t.id, t] as const))('%s builds a valid board', (_id, template) => {
    const board = buildBoardFromTemplate(template);
    expect(BoardSchema.safeParse(board).success).toBe(true);
    expect(board.columns.map((c) => c.title)).toEqual(template.columns);
    expect(board.columns.flatMap((c) => c.cards)).toHaveLength(template.cards.length);
  });

  it('resolves label names to label ids', () => {
    const board = buildBoardFromTemplate(TEMPLATES.find((t) => t.id === 'network')!);
    const ids = new Set(board.labels.map((l) => l.id));
    for (const card of board.columns.flatMap((c) => c.cards)) {
      card.labelIds.forEach((id) => expect(ids.has(id)).toBe(true));
    }
  });

  it('offers technical boards Scrum, incidents, networks, IT help desk and blank; the look is a separate choice', () => {
    expect(templatesFor('technical').map((t) => t.id)).toEqual([
      'scrum',
      'bug-tracker',
      'network',
      'it-support',
      'content',
      'blank',
    ]);
    expect(templatesFor('simple').map((t) => t.id)).toEqual([
      'personal',
      'team-project',
      'study',
      'content',
      'blank',
    ]);
    expect(buildBoardFromTemplate(getTemplate('scrum')!).skin).toBe('default');
    expect(buildBoardFromTemplate(getTemplate('network')!, { skin: 'halloween' }).skin).toBe(
      'halloween',
    );
  });

  it('network cards start from the change request template', () => {
    const board = buildBoardFromTemplate(getTemplate('network')!);
    expect(board.cardTemplate).toBe(NETWORK_CHANGE_TEMPLATE);
    expect(board.columns.find((c) => c.title === 'Implementación')!.wipLimit).toBe(2);
  });

  it('offers the blank template to every profile', () => {
    expect(templatesFor('technical').some((t) => t.id === 'blank')).toBe(true);
    expect(templatesFor('simple').some((t) => t.id === 'blank')).toBe(true);
  });
});

describe('scrum template', () => {
  const scrum = getTemplate('scrum')!;

  it('is the default choice for technical profiles', () => {
    expect(templatesFor('technical')[0]!.id).toBe('scrum');
  });

  it('builds a valid board with WIP limits and the user story template', () => {
    const board = buildBoardFromTemplate(scrum);
    expect(BoardSchema.safeParse(board).success).toBe(true);
    expect(board.cardTemplate).toBe(USER_STORY_TEMPLATE);
    const wip = Object.fromEntries(board.columns.map((c) => [c.title, c.wipLimit]));
    expect(board.columns.map((c) => c.title)).toEqual([
      'New issues',
      'Icebox',
      'Product Backlog',
      'Sprint Backlog',
      'In progress',
      'In review',
      'Done',
    ]);
    expect(wip['In progress']).toBe(3);
    expect(wip['Product Backlog']).toBe(5);
    expect(wip['In review']).toBe(5);
    expect(board.columns[4]!.description).toBe('Se está trabajando activamente');
    // Example cards are numbered like GitHub issues.
    expect(board.columns.flatMap((c) => c.cards).every((c) => c.number !== null)).toBe(true);
    expect(board.labels.map((l) => l.name)).toEqual(['enhancement', 'bug', 'technical debt']);
  });

  it('previews the story without Markdown noise', () => {
    expect(previewText(USER_STORY_TEMPLATE)).toMatch(/^Como \[rol\] · Necesito \[función\]/);
    expect(previewText(USER_STORY_TEMPLATE)).not.toMatch(/\*\*|```|###/);
  });
});

describe('IT help desk template', () => {
  const board = buildBoardFromTemplate(getTemplate('it-support')!);

  it('follows the service desk flow, with tickets as the card template', () => {
    expect(board.profile).toBe('technical');
    expect(board.cardTemplate).toBe(IT_TICKET_TEMPLATE);
    expect(board.columns.map((c) => c.title)).toEqual([
      'Nuevos',
      'En curso',
      'Esperando al usuario',
      'Escalado',
      'En espera de terceros',
      'Resuelto',
      'Cerrado',
    ]);
    expect(board.columns.find((c) => c.title === 'En curso')!.wipLimit).toBe(5);
    expect(board.columns.find((c) => c.title === 'Escalado')!.wipLimit).toBe(3);
    expect(board.labels.map((l) => l.name)).toEqual([
      'Incidente',
      'Solicitud',
      'Acceso',
      'Hardware',
      'Software',
      'Cambio',
    ]);
  });

  it('gives example tickets an SLA due date counted from today', () => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const iso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const outlook = board.columns
      .flatMap((c) => c.cards)
      .find((c) => c.title.startsWith('Outlook'))!;
    expect(outlook.dueDate).toBe(iso);
    expect(outlook.priority).toBe('high');
    expect(outlook.type).toBe('bug');
  });
});

describe('content creators template', () => {
  const board = buildBoardFromTemplate(getTemplate('content')!);

  it('is offered with both styles, but always builds a Sencillo board', () => {
    expect(templatesFor('technical').some((t) => t.id === 'content')).toBe(true);
    expect(templatesFor('simple').some((t) => t.id === 'content')).toBe(true);
    // Never a technical board, even when picked from the Técnico list.
    expect(buildBoardFromTemplate(getTemplate('content')!, { profile: 'technical' }).profile).toBe(
      'simple',
    );
  });

  it('goes from the idea to the published post, with a content brief per card', () => {
    expect(board.profile).toBe('simple');
    expect(board.cardTemplate).toBe(CONTENT_BRIEF_TEMPLATE);
    expect(board.columns.map((c) => c.title)).toEqual([
      'Ideas',
      'Guion',
      'Grabación',
      'Edición',
      'Programado',
      'Publicado',
    ]);
    expect(board.columns.find((c) => c.title === 'Edición')!.wipLimit).toBe(2);
    // Scheduled content carries its publish day.
    expect(board.columns.find((c) => c.title === 'Programado')!.cards[0]!.dueDate).not.toBeNull();
  });

  it('previews the brief without Markdown noise', () => {
    expect(previewText(CONTENT_BRIEF_TEMPLATE)).not.toMatch(/\*\*|###/);
  });
});
