/**
 * Header chip of a board linked to a GitHub Project: opens the Project and
 * shows the sync state with a pixel dot (green live, blue writing, gray
 * offline, red error). Errors read out on hover and to screen readers.
 */
import type { GithubLink } from '@devbord/shared';
import { PixelIcon } from '../../design';
import { useGithub, type SyncState } from '../../controllers/githubController';
import { useT, type MessageKey } from '../../i18n';

const STATE: Record<SyncState, { label: MessageKey; color: string }> = {
  off: { label: 'github.sync.off', color: 'var(--faint)' },
  live: { label: 'github.sync.live', color: 'var(--label-green-ink)' },
  syncing: { label: 'github.sync.syncing', color: 'var(--accent)' },
  offline: { label: 'github.sync.offline', color: 'var(--faint)' },
  error: { label: 'github.error', color: 'var(--label-red-ink)' },
};

export function GithubBadge({ link }: { link: GithubLink }) {
  const sync = useGithub((s) => s.sync);
  const user = useGithub((s) => s.user);
  const error = useGithub((s) => s.error);
  const configured = useGithub((s) => s.configured);
  const t = useT();
  const state = !configured || !user ? null : STATE[sync];
  const hint = !configured
    ? t('github.notConfigured')
    : !user
      ? t('github.connectToSync')
      : sync === 'error' && error
        ? `${t(state!.label)}: ${error}`
        : t(state!.label);

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      data-cursor-hint={hint}
      aria-label={t('github.badge', { owner: link.owner, number: link.number, hint })}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-xs text-muted hover:text-ink"
    >
      <PixelIcon name="issue" size={12} />
      {link.owner} #{link.number}
      <span
        aria-hidden
        className="size-2"
        style={{ background: state?.color ?? 'var(--label-yellow-ink)' }}
      />
    </a>
  );
}
