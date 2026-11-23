import { useState } from 'react';
import {
  CardTypeSchema,
  PrioritySchema,
  STORY_POINTS,
  StoryPointsSchema,
  type Board,
  type Card,
  type CardPatch,
  type Label,
  type ProfileFeatures,
} from '@devbord/shared';
import { Badge, Button, Field, Input, Modal, Select, Textarea, confirm, cx } from '../../design';
import { CARD_TYPE_META, PRIORITY_META } from './cardMeta';
import { CardCalendar } from '../connections/CardCalendar';
import { CardLinks } from '../connections/CardLinks';
import { GithubCardPanel } from '../connections/GithubCardPanel';
import { useT } from '../../i18n';

export interface CardDetailModalProps {
  card: Card | null;
  columnTitle?: string;
  labels: Label[];
  features: ProfileFeatures;
  onClose: () => void;
  onSave: (cardId: string, patch: CardPatch) => void;
  onDelete: (cardId: string) => void;
  /** The board, when it mirrors a GitHub Project: adds the GitHub panel and field rules. */
  board?: Board;
}

/**
 * Card detail editor. Edits a local draft and saves on "Guardar", so the
 * board does not re-render on every keystroke.
 */
export function CardDetailModal({ card, ...rest }: CardDetailModalProps) {
  const t = useT();
  // `key` resets the draft whenever a different card is opened.
  return (
    <Modal open={card !== null} title={t('cardDetail.title')} onClose={rest.onClose}>
      {card && <CardForm key={card.id} card={card} {...rest} />}
    </Modal>
  );
}

function CardForm({
  card,
  columnTitle,
  labels,
  features,
  onClose,
  onSave,
  onDelete,
  board,
}: Omit<CardDetailModalProps, 'card'> & { card: Card }) {
  const t = useT();
  const link = board?.github ?? null;
  /** On linked boards a field only exists if the Project has it. */
  const missing = (has: boolean) => (link && !has ? t('cardDetail.missingField') : undefined);
  const [draft, setDraft] = useState<CardPatch>({
    title: card.title,
    description: card.description,
    labelIds: card.labelIds,
    dueDate: card.dueDate,
    type: card.type,
    priority: card.priority,
    storyPoints: card.storyPoints,
    sprint: card.sprint,
    links: card.links,
  });
  const set = (patch: CardPatch) => setDraft((d) => ({ ...d, ...patch }));
  const labelIds = draft.labelIds ?? [];
  const canSave = Boolean(draft.title?.trim());

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSave) return;
        onSave(card.id, { ...draft, title: draft.title!.trim() });
        onClose();
      }}
    >
      {columnTitle && (
        <p className="-mt-2 text-sm text-muted">
          {t('cardDetail.in')} <strong className="text-ink">{columnTitle}</strong>
        </p>
      )}

      <Field label={t('cardDetail.titleField')} htmlFor="card-title">
        <Input
          id="card-title"
          required
          maxLength={200}
          value={draft.title ?? ''}
          onChange={(e) => set({ title: e.target.value })}
        />
      </Field>

      <Field label={t('cardDetail.description')} htmlFor="card-description">
        <Textarea
          id="card-description"
          placeholder={t('cardDetail.descriptionPlaceholder')}
          className="min-h-52"
          value={draft.description ?? ''}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Field>

      {labels.length > 0 && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
            {t('cardDetail.labels')}
          </legend>
          <div className="flex flex-wrap gap-2">
            {labels.map((l) => {
              const active = labelIds.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    set({
                      labelIds: active ? labelIds.filter((id) => id !== l.id) : [...labelIds, l.id],
                    })
                  }
                  className={cx('transition-opacity', !active && 'opacity-45 hover:opacity-80')}
                >
                  <Badge color={l.color} className={active ? 'ring-1 ring-current' : undefined}>
                    {l.name}
                  </Badge>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('cardDetail.due')} htmlFor="card-due">
          <Input
            id="card-due"
            type="date"
            disabled={Boolean(missing(link?.fields.dueDate ?? true))}
            title={missing(link?.fields.dueDate ?? true)}
            value={draft.dueDate ?? ''}
            onChange={(e) => set({ dueDate: e.target.value || null })}
          />
        </Field>
        {features.cardTypes && (
          <Field label={t('cardDetail.type')} htmlFor="card-type">
            <Select
              id="card-type"
              value={draft.type}
              onChange={(e) => set({ type: CardTypeSchema.parse(e.target.value) })}
            >
              {CardTypeSchema.options.map((type) => (
                <option key={type} value={type}>
                  {t(CARD_TYPE_META[type].label)}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {features.priority && (
          <Field label={t('cardDetail.priority')} htmlFor="card-priority">
            <Select
              id="card-priority"
              disabled={Boolean(missing(link?.fields.priority ?? true))}
              title={missing(link?.fields.priority ?? true)}
              value={draft.priority ?? ''}
              onChange={(e) =>
                set({ priority: e.target.value ? PrioritySchema.parse(e.target.value) : null })
              }
            >
              <option value="">{t('cardDetail.noPriority')}</option>
              {PrioritySchema.options.map((p) => (
                <option key={p} value={p}>
                  {t(PRIORITY_META[p].label)}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {features.agile && (
          <Field label={t('cardDetail.sprint')} htmlFor="card-sprint">
            {link ? (
              // GitHub: the Project's iterations.
              <Select
                id="card-sprint"
                disabled={!link.fields.iteration}
                title={missing(link.fields.iteration)}
                value={draft.sprint ?? ''}
                onChange={(e) => set({ sprint: e.target.value || null })}
              >
                <option value="">{t('cardDetail.noSprint')}</option>
                {draft.sprint && !link.iterations.some((i) => i.title === draft.sprint) && (
                  <option value={draft.sprint}>{draft.sprint}</option>
                )}
                {link.iterations.map((i) => (
                  <option key={i.id} value={i.title}>
                    {i.title}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id="card-sprint"
                maxLength={30}
                placeholder={t('cardDetail.sprintPlaceholder')}
                value={draft.sprint ?? ''}
                onChange={(e) => set({ sprint: e.target.value.trim() ? e.target.value : null })}
              />
            )}
          </Field>
        )}
        {features.agile && (
          <Field label="Story points" htmlFor="card-points">
            <Select
              id="card-points"
              disabled={Boolean(missing(link?.fields.estimate ?? true))}
              title={missing(link?.fields.estimate ?? true)}
              value={draft.storyPoints ?? ''}
              onChange={(e) =>
                set({
                  storyPoints: e.target.value
                    ? StoryPointsSchema.parse(Number(e.target.value))
                    : null,
                })
              }
            >
              <option value="">{t('cardDetail.noPoints')}</option>
              {STORY_POINTS.map((p) => (
                <option key={p} value={p}>
                  {p === 13 ? t('cardDetail.split') : p}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      {draft.dueDate && (
        <CardCalendar
          cardId={card.id}
          title={draft.title?.trim() || card.title}
          date={draft.dueDate}
          description={draft.description ?? ''}
        />
      )}

      {board?.github && <GithubCardPanel board={board} card={card} />}

      <CardLinks links={draft.links ?? []} onChange={(links) => set({ links })} />

      <footer className="mt-2 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          className="text-danger hover:text-danger"
          onClick={() => {
            void confirm(t('cardDetail.deleteConfirm'), {
              confirmLabel: t('common.delete'),
              danger: true,
            }).then((ok) => {
              if (!ok) return;
              onDelete(card.id);
              onClose();
            });
          }}
        >
          {t('common.delete')}
        </Button>
        <div className="flex gap-2">
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="primary" disabled={!canSave}>
            {t('common.save')}
          </Button>
        </div>
      </footer>
    </form>
  );
}
