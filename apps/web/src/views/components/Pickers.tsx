/**
 * Selection grids reused by onboarding and the "new board" modal.
 * Built as radio groups so keyboard and screen-reader users get the
 * native arrow-key behaviour for free.
 */
import type { ReactNode } from 'react';
import {
  BoardModeSchema,
  BoardSkinSchema,
  ProfileSchema,
  type BoardMode,
  type BoardSkin,
  type Profile,
} from '@devbord/shared';
import { cx } from '../../design';
import { SKINS } from '../../controllers/themeController';
import { useT } from '../../i18n';
import type { BoardTemplate } from '../../templates';

interface OptionCardProps {
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  preview?: ReactNode;
}

function OptionCard({
  name,
  value,
  checked,
  onSelect,
  title,
  description,
  preview,
}: OptionCardProps) {
  return (
    <label
      className={cx(
        'flex cursor-pointer flex-col gap-1.5 rounded-xl border bg-card p-4 shadow-card transition-[transform,box-shadow,border-color]',
        // The radio is visually hidden, so show its keyboard focus on the card.
        'has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-accent',
        checked
          ? 'border-accent shadow-[0_0_0_3px_var(--accent-soft)]'
          : 'border-line-soft hover:-translate-y-0.5 hover:shadow-lift',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      {preview}
      <span className="font-pixel text-base">{title}</span>
      <span className="text-sm text-muted">{description}</span>
    </label>
  );
}

export function ProfilePicker({
  value,
  onChange,
}: {
  value: Profile;
  onChange: (p: Profile) => void;
}) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t('pickers.profile')} className="grid gap-3 sm:grid-cols-2">
      {ProfileSchema.options.map((p) => (
        <OptionCard
          key={p}
          name="profile"
          value={p}
          checked={value === p}
          onSelect={() => onChange(p)}
          title={t(`profile.${p}.title`)}
          description={t(`profile.${p}.description`)}
        />
      ))}
    </div>
  );
}

/** A tiny board painted in a skin's colors: page, three columns, cards and the accent. */
export function SkinPreview({ skin, className }: { skin: BoardSkin; className?: string }) {
  const { swatch } = SKINS[skin];
  return (
    <span
      aria-hidden
      className={cx('flex gap-1 rounded-md p-1', className ?? 'mb-1 h-12')}
      style={{ background: swatch.bg }}
    >
      {[3, 2, 1].map((cards, i) => (
        <span
          key={i}
          className="flex flex-1 flex-col gap-0.5 rounded-[3px] p-0.5"
          style={{ background: swatch.column }}
        >
          {Array.from({ length: cards }, (_, j) => (
            <span
              key={j}
              className="h-1.5 rounded-[1px]"
              style={{
                background: swatch.card,
                boxShadow: j === 0 ? `inset 2px 0 0 ${swatch.accent}` : undefined,
              }}
            />
          ))}
        </span>
      ))}
    </span>
  );
}

/** The look of the board (any template can wear any skin). */
export function SkinPicker({
  value,
  onChange,
}: {
  value: BoardSkin;
  onChange: (skin: BoardSkin) => void;
}) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t('pickers.skin')} className="grid gap-3 sm:grid-cols-3">
      {BoardSkinSchema.options.map((s) => (
        <OptionCard
          key={s}
          name="skin"
          value={s}
          checked={value === s}
          onSelect={() => onChange(s)}
          title={t(`skin.${s}.title`)}
          description={t(`skin.${s}.description`)}
          preview={<SkinPreview skin={s} />}
        />
      ))}
    </div>
  );
}

/** Column-count preview bars, so templates are recognisable at a glance. */
const ColumnsPreview = ({ count }: { count: number }) => (
  <span className="mb-1 flex h-6 gap-1" aria-hidden>
    {Array.from({ length: count }, (_, i) => (
      <span
        key={i}
        className="flex-1 rounded-[2px] bg-surface-3"
        style={{ height: `${100 - i * 12}%` }}
      />
    ))}
  </span>
);

export function TemplatePicker({
  templates,
  value,
  onChange,
}: {
  templates: readonly BoardTemplate[];
  value: string;
  onChange: (id: string) => void;
}) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t('pickers.template')} className="grid gap-3 sm:grid-cols-2">
      {templates.map((tpl) => (
        <OptionCard
          key={tpl.id}
          name="template"
          value={tpl.id}
          checked={value === tpl.id}
          onSelect={() => onChange(tpl.id)}
          title={tpl.name}
          description={tpl.description}
          preview={<ColumnsPreview count={tpl.columns.length} />}
        />
      ))}
    </div>
  );
}

/**
 * Personal vs team, chosen once at creation. Shown as two cards so the
 * choice is explicit: team and personal work never end up mixed.
 */
export function ModePicker({
  value,
  onChange,
}: {
  value: BoardMode;
  onChange: (m: BoardMode) => void;
}) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t('pickers.mode')} className="grid gap-3 sm:grid-cols-2">
      {BoardModeSchema.options.map((m) => (
        <OptionCard
          key={m}
          name="mode"
          value={m}
          checked={value === m}
          onSelect={() => onChange(m)}
          title={t(`mode.${m}.title`)}
          description={t(`mode.${m}.description`)}
        />
      ))}
    </div>
  );
}
