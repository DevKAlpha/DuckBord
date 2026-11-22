/**
 * "Conectar Project de GitHub": sign in with GitHub, tick the Projects (v2) you
 * want and bring them all at once. Each one becomes a DuckBord board with all
 * its content, kept in sync both ways with GitHub (see githubController).
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Modal, PixelIcon } from '../../design';
import { useGithub } from '../../controllers/githubController';
import { MAX_ACTIVE_BOARDS } from '@devbord/shared';
import { activeBoards, useBoardController } from '../../controllers/boardController';
import type { GithubProjectSummary } from '../../integrations/github/client';
import { useT } from '../../i18n';

export function GithubProjectsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Modal open={open} title={t('home.connectGithub')} onClose={onClose}>
      {open && <ProjectPicker onClose={onClose} />}
    </Modal>
  );
}

function ProjectPicker({ onClose }: { onClose: () => void }) {
  const { configured, user, busy, error } = useGithub();
  const navigate = useNavigate();
  const t = useT();
  const [list, setList] = useState<{ projects: GithubProjectSummary[]; installUrl: string } | null>(
    null,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** Progress while bringing the Projects: done of total. */
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  // Projects that already have a board here: they are only refreshed.
  const boards = useBoardController((st) => st.boards);
  const linked = useMemo(
    () => new Set(activeBoards(boards).flatMap((b) => (b.github ? [b.github.projectId] : []))),
    [boards],
  );
  // New boards fit under MAX_ACTIVE_BOARDS; Projects already here are only refreshed.
  const room = MAX_ACTIVE_BOARDS - activeBoards(boards).length;
  const newPicked = [...selected].filter((id) => !linked.has(id)).length;
  const [listError, setListError] = useState<string | null>(null);
  const loading = Boolean(user) && !list && !listError;

  useEffect(() => void useGithub.getState().init(), []);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    useGithub
      .getState()
      .listProjects()
      .then((l) => alive && setList(l))
      .catch((e: unknown) => alive && setListError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [user]);

  if (!configured) {
    return <p className="text-sm text-muted">{t('github.noServer')}</p>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted">{t('github.pickIntro')}</p>
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => void useGithub.getState().signIn()}
        >
          <PixelIcon name="issue" />
          {busy ? t('common.connecting') : t('github.connect')}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-sm text-muted">
        <img src={user.avatarUrl} alt="" className="size-5 rounded-sm" />
        {t('github.signedInAs')} <strong className="text-ink">{user.login}</strong>
      </p>
      {loading && <p className="text-sm text-faint">{t('github.searching')}</p>}
      {listError && (
        <p role="alert" className="text-sm text-danger">
          {listError}
        </p>
      )}
      {list && list.projects.length === 0 && (
        <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
          {t('github.none')}
        </p>
      )}
      {list && list.projects.length > 0 && (
        <>
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{t('github.selected', { n: selected.size, total: list.projects.length })}</span>
            <button
              type="button"
              className="underline hover:text-ink"
              onClick={() => {
                if (selected.size === list.projects.length) return setSelected(new Set());
                // All that fit: every Project already here, then new ones while there is room.
                let left = room;
                setSelected(
                  new Set(
                    list.projects.filter((p) => linked.has(p.id) || left-- > 0).map((p) => p.id),
                  ),
                );
              }}
            >
              {selected.size === list.projects.length
                ? t('github.clearAll')
                : t('github.selectAll')}
            </button>
          </div>
          {newPicked >= room && (
            <p className="text-xs text-muted">
              {room > 0
                ? t('github.room', { n: room, max: MAX_ACTIVE_BOARDS })
                : t('github.full', { max: MAX_ACTIVE_BOARDS })}
            </p>
          )}
          <ul className="flex flex-col gap-1.5">
            {list.projects.map((p) => {
              const on = selected.has(p.id);
              return (
                <li key={p.id}>
                  <label className="flex w-full items-center gap-2.5 rounded-lg border border-line-soft bg-card px-3 py-2 text-sm hover:border-line has-[:checked]:border-accent">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={
                        progress !== null || (!on && !linked.has(p.id) && newPicked >= room)
                      }
                      className="accent-[var(--accent)]"
                      onChange={() => {
                        const next = new Set(selected);
                        if (on) next.delete(p.id);
                        else next.add(p.id);
                        setSelected(next);
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate font-semibold">{p.title}</span>
                    {linked.has(p.id) && (
                      <span className="shrink-0 text-xs text-accent">{t('github.already')}</span>
                    )}
                    <span className="shrink-0 text-xs text-faint">
                      {p.owner} · #{p.number}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-end gap-2">
            {progress && (
              <span className="mr-auto text-xs text-muted" aria-live="polite">
                {t('github.bringing', { n: progress.done, total: progress.total })}
              </span>
            )}
            <Button onClick={onClose}>{t('common.cancel')}</Button>
            <Button
              variant="primary"
              disabled={selected.size === 0 || progress !== null}
              onClick={async () => {
                const ids = list.projects.filter((p) => selected.has(p.id)).map((p) => p.id);
                const boardIds: string[] = [];
                setProgress({ done: 0, total: ids.length });
                try {
                  // One at a time: each Project is several GitHub requests.
                  for (const [i, id] of ids.entries()) {
                    boardIds.push(await useGithub.getState().openProject(id));
                    setProgress({ done: i + 1, total: ids.length });
                  }
                  onClose();
                  // One Project: straight into it. Several: they are on the home page.
                  if (boardIds.length === 1) navigate(`/b/${boardIds[0]}`);
                } catch (e) {
                  setListError(e instanceof Error ? e.message : String(e));
                } finally {
                  setProgress(null);
                }
              }}
            >
              <PixelIcon name="import" />
              {selected.size > 1
                ? t('github.bringMany', { n: selected.size })
                : t('github.bringOne')}
            </Button>
          </div>
        </>
      )}
      {list && (
        <a
          href={list.installUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted underline"
        >
          {t('github.install')}
        </a>
      )}
    </div>
  );
}
