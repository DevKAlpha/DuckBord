/**
 * Whiteboard switcher (story 15), in the whiteboard header: rename the open
 * whiteboard, jump to another one, create or delete. Same pattern as the board
 * switcher: a native <select> layered over a pixel chip, so keyboard, screen
 * readers and mobile pickers work for free.
 *
 * Team boards show a "shared" chip instead: the team draws on one whiteboard
 * on purpose, so nobody is left explaining on a sheet the others cannot see.
 */
import { useSketch, useSketchSheets } from '../../controllers/sketchController';
import { IconButton, PixelIcon, confirm } from '../../design';
import { InlineEdit } from '../board/InlineEdit';
import { useT } from '../../i18n';

const NEW_SHEET = '__new__';

export function SheetSwitcher({ team }: { team: boolean }) {
  const sheets = useSketchSheets();
  const sheetId = useSketch((s) => s.sheetId);
  const current = sheets.find((s) => s.id === sheetId);
  const t = useT();

  if (team) {
    return (
      <span
        className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md bg-surface-3 px-1.5 text-xs text-muted"
        title={t('sketch.sheet.sharedHint')}
      >
        <PixelIcon name="team" size={12} />
        {t('sketch.sheet.shared')}
      </span>
    );
  }
  if (!current) return null;

  const { selectSheet, addSheet, renameSheet, removeSheet } = useSketch.getState();
  const index = sheets.indexOf(current);

  return (
    <div className="flex min-w-0 items-center gap-1">
      <InlineEdit
        value={current.name}
        label={t('sketch.sheet.name')}
        maxLength={40}
        onSave={(name) => renameSheet(current.id, name)}
        className="min-w-0 truncate text-sm"
      />
      <span className="relative inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs text-muted tabular-nums hover:bg-surface-3/70 hover:text-ink">
        {index + 1}/{sheets.length}
        <PixelIcon name="chevron" size={12} />
        <select
          aria-label={t('sketch.sheet.switch')}
          className="absolute inset-0 cursor-pointer opacity-0"
          value={current.id}
          onChange={(e) =>
            e.target.value === NEW_SHEET ? addSheet() : selectSheet(e.target.value)
          }
        >
          {sheets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          <option value={NEW_SHEET}>+ {t('sketch.sheet.new')}</option>
        </select>
      </span>
      <IconButton icon="plus" label={t('sketch.sheet.new')} onClick={addSheet} />
      {sheets.length > 1 && (
        <IconButton
          icon="trash"
          label={t('sketch.sheet.delete')}
          onClick={async () => {
            const ok = await confirm(t('sketch.sheet.deleteConfirm', { name: current.name }), {
              confirmLabel: t('common.delete'),
              danger: true,
            });
            if (ok) removeSheet(current.id);
          }}
        />
      )}
    </div>
  );
}
