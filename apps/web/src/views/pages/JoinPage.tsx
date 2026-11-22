import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { PixelIcon } from '../../design';
import { canAddBoard, useBoardController } from '../../controllers/boardController';
import { MAX_ACTIVE_BOARDS } from '@devbord/shared';
import { useCollab } from '../../controllers/collabController';
import { AppShell } from '../components/AppShell';
import { NamePrompt } from '../team/NamePrompt';
import { useT } from '../../i18n';

/** After this long without data, explain that someone must have the board open. */
const SLOW_AFTER_MS = 15000;

/**
 * Invite link landing (`#/join/:boardId/:key`): connects to the team room and
 * waits until a teammate sends the board, then opens it.
 */
export function JoinPage() {
  const { boardId = '', key = '' } = useParams();
  const arrived = useBoardController((s) => s.boards.some((b) => b.id === boardId));
  // No room for one more board: joining would bring a board we cannot keep.
  const full = useBoardController((s) => !canAddBoard(s.boards));
  const [slow, setSlow] = useState(false);
  const t = useT();

  useEffect(() => {
    if (arrived || full || !boardId || !key) return;
    void useCollab.getState().join(boardId, key);
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [arrived, full, boardId, key]);

  // The board page reopens the same room; leaving here before that would drop it.
  if (arrived) return <Navigate to={`/b/${boardId}`} replace />;

  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <PixelIcon name="team" size={48} />
        {full ? (
          <>
            <h1 className="text-2xl">{t('join.fullTitle')}</h1>
            <p className="text-muted" role="status">
              {t('join.full', { max: MAX_ACTIVE_BOARDS })}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl">{t('join.joining')}</h1>
            <p className="text-muted" role="status">
              {slow ? t('join.slow') : t('join.searching')}
            </p>
          </>
        )}
        <Link to="/" className="text-sm text-accent hover:underline">
          {t('join.back')}
        </Link>
      </main>
      <NamePrompt />
    </AppShell>
  );
}
