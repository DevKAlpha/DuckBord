/**
 * Shown when archiving with MAX_ARCHIVED_BOARDS already archived: the person
 * picks an archived board to delete (it can be downloaded first), and then the
 * board they wanted to archive is archived.
 */
import { MAX_ARCHIVED_BOARDS } from '@devbord/shared';
import { Button, IconButton, Modal, confirm } from '../../design';
import { archivedBoards, useBoardController } from '../../controllers/boardController';
import { removeBoard } from '../../controllers/boardLifecycle';
import { downloadBoardJson } from '../board/downloadBoard';
import { dateFormat, useT } from '../../i18n';

export function ArchiveFullModal({
  open,
  boardName,
  onClose,
  onFreed,
}: {
  open: boolean;
  /** The board waiting to be archived. */
  boardName: string;
  onClose: () => void;
  /** Called once an archived board was deleted: there is room again. */
  onFreed: () => void;
}) {
  const boards = useBoardController((s) => s.boards);
  const archived = archivedBoards(boards);
  const t = useT();

  return (
    <Modal open={open} title={t('archiveFull.title')} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-[15px] leading-snug">
          {t('archiveFull.body', { max: MAX_ARCHIVED_BOARDS, name: boardName })}
        </p>
        <ul className="flex flex-col gap-1.5">
          {archived.map((b) => (
            <li
              key={b.id}
              className="flex items-center gap-2 rounded-lg border border-line-soft bg-card px-3 py-1.5 text-sm"
            >
              <span className="min-w-0 flex-1 truncate font-semibold">{b.name}</span>
              <span className="shrink-0 text-xs text-faint">
                {dateFormat({ day: 'numeric', month: 'short' }).format(
                  new Date(b.archivedAt ?? b.updatedAt),
                )}
              </span>
              <IconButton
                icon="download"
                label={t('common.downloadJson', { name: b.name })}
                onClick={() => downloadBoardJson(b)}
              />
              <IconButton
                icon="trash"
                label={t('common.deleteNamed', { name: b.name })}
                onClick={async () => {
                  const ok = await confirm(
                    t('archiveFull.confirm', { archived: b.name, name: boardName }),
                    { confirmLabel: t('archiveFull.confirmLabel'), danger: true },
                  );
                  if (!ok) return;
                  await removeBoard(b);
                  onFreed();
                }}
              />
            </li>
          ))}
        </ul>
        <footer className="flex justify-end">
          <Button onClick={onClose}>{t('common.cancel')}</Button>
        </footer>
      </div>
    </Modal>
  );
}
