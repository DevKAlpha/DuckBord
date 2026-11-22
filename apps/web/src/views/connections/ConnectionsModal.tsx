/**
 * "Conexiones": the work accounts and channels the board can use. Google and
 * Microsoft sign in for this tab (calendar events); Slack gets a webhook per
 * board (notices on card moves). Each one lists its tools, the same ones an
 * AI agent will be able to call.
 */
import { useEffect, useState } from 'react';
import type { Board } from '@devbord/shared';
import { Button, Field, Input, Modal, Select } from '../../design';
import { useConnections } from '../../controllers/connectionsController';
import { isConfigured, type AccountId } from '../../integrations/accounts';
import { CONNECTIONS, type Connection } from '../../integrations/connections';
import {
  isSlackWebhook,
  postToSlack,
  readSlack,
  saveSlack,
  type SlackConfig,
} from '../../integrations/slack';
import { ProviderMark } from './ProviderMark';
import { GithubProjectsModal } from './GithubProjectsModal';
import { useGithub } from '../../controllers/githubController';
import { useT, type MessageKey } from '../../i18n';

export function ConnectionsModal({
  board,
  open,
  onClose,
}: {
  board: Board;
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <Modal open={open} title={t('board.connections')} onClose={onClose}>
      {open && <ConnectionList board={board} />}
    </Modal>
  );
}

function ConnectionList({ board }: { board: Board }) {
  const error = useConnections((s) => s.error);
  const t = useT();
  // Tokens expire; re-check each time the panel opens.
  useEffect(() => {
    useConnections.getState().refresh();
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <p className="-mt-1 text-sm text-muted">{t('conn.intro')}</p>
      {CONNECTIONS.map((c) => (
        <section key={c.id} className="rounded-xl border border-line-soft bg-surface-2 p-3">
          <header className="mb-1 flex items-center gap-2">
            <ProviderMark provider={c.id} size={12} />
            <h3 className="font-pixel text-base">{c.name}</h3>
            {(c.id === 'google' || c.id === 'microsoft') && (
              <span className="ml-auto">
                <AccountStatus id={c.id} />
              </span>
            )}
          </header>
          <p className="text-sm text-muted">{t(`conn.${c.id}.description`)}</p>
          <Tools connection={c} />
          {c.id === 'slack' ? (
            <SlackForm boardId={board.id} />
          ) : c.id === 'github' ? (
            <GithubSection board={board} />
          ) : (
            <AccountActions id={c.id} />
          )}
        </section>
      ))}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** The tools of a connection, as an agent would see them. */
function Tools({ connection }: { connection: Connection }) {
  const t = useT();
  // The calendar tool names its calendar.
  const calendar = connection.id === 'google' ? 'Google Calendar' : 'Outlook';
  return (
    <ul className="mt-2 flex flex-col gap-1 text-xs">
      {connection.tools.map((tool) => (
        <li key={tool.name} className="flex flex-wrap items-baseline gap-x-2">
          <code className="rounded bg-surface-3 px-1 py-px font-mono text-[11px] text-ink">
            {tool.name}
          </code>
          <span className="text-faint">{t(`tool.${tool.name}` as MessageKey, { calendar })}</span>
        </li>
      ))}
    </ul>
  );
}

function AccountStatus({ id }: { id: AccountId }) {
  const on = useConnections((s) => s.signedIn[id]);
  const t = useT();
  if (!isConfigured(id))
    return <span className="text-xs text-faint">{t('conn.notConfigured')}</span>;
  return (
    <span className={on ? 'text-xs text-[var(--label-green-ink)]' : 'text-xs text-faint'}>
      {on ? t('conn.connected') : t('conn.notConnected')}
    </span>
  );
}

function AccountActions({ id }: { id: AccountId }) {
  const on = useConnections((s) => s.signedIn[id]);
  const busy = useConnections((s) => s.busy);
  const { connect, disconnect } = useConnections.getState();
  const t = useT();

  if (!isConfigured(id)) {
    return <p className="mt-2 text-xs text-faint">{t('conn.missingClientId')}</p>;
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {on ? (
        <Button size="sm" onClick={() => disconnect(id)}>
          {t('conn.disconnect')}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="primary"
          disabled={busy !== null}
          onClick={() => void connect(id)}
        >
          {busy === id ? t('common.connecting') : t('conn.connect')}
        </Button>
      )}
      <span className="text-xs text-faint">{t('conn.sessionTab')}</span>
    </div>
  );
}

/** Slack channel of the board: an Incoming Webhook kept in this browser only. */
function SlackForm({ boardId }: { boardId: string }) {
  const [saved, setSaved] = useState<SlackConfig | null>(() => readSlack(boardId));
  const [webhook, setWebhook] = useState(saved?.webhook ?? '');
  const [notify, setNotify] = useState<SlackConfig['notify']>(saved?.notify ?? 'all');
  const [note, setNote] = useState<string | null>(null);
  const valid = isSlackWebhook(webhook);
  const t = useT();

  return (
    <form
      className="mt-3 flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        const config = { webhook: webhook.trim(), notify };
        saveSlack(boardId, config);
        setSaved(config);
        setNote(t('slack.saved'));
      }}
    >
      <Field label={t('slack.webhook')} htmlFor="slack-webhook">
        <Input
          id="slack-webhook"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://hooks.slack.com/services/…"
          value={webhook}
          onChange={(e) => {
            setWebhook(e.target.value);
            setNote(null);
          }}
        />
      </Field>
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-56">
          <Field label={t('slack.notify')} htmlFor="slack-notify">
            <Select
              id="slack-notify"
              className="h-8 text-sm"
              value={notify}
              onChange={(e) => setNotify(e.target.value === 'done' ? 'done' : 'all')}
            >
              <option value="all">{t('slack.notifyAll')}</option>
              <option value="done">{t('slack.notifyDone')}</option>
            </Select>
          </Field>
        </div>
        <Button size="sm" type="submit" variant="primary" disabled={!valid}>
          {t('common.save')}
        </Button>
        <Button
          size="sm"
          disabled={!valid}
          onClick={() =>
            void postToSlack(webhook.trim(), t('slack.hello'))
              .then(() => setNote(t('slack.testSent')))
              .catch(() => setNote(t('slack.testFailed')))
          }
        >
          {t('slack.test')}
        </Button>
        {saved && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              saveSlack(boardId, null);
              setSaved(null);
              setWebhook('');
              setNote(t('slack.removed'));
            }}
          >
            {t('slack.remove')}
          </Button>
        )}
      </div>
      <p className="text-xs text-faint" aria-live="polite">
        {note ?? (webhook && !valid ? t('slack.invalid') : t('slack.help'))}
      </p>
    </form>
  );
}

/** GitHub account, and the Project this board mirrors (if any). */
function GithubSection({ board }: { board: Board }) {
  const { configured, user, busy } = useGithub();
  const [picking, setPicking] = useState(false);
  const t = useT();
  useEffect(() => void useGithub.getState().init(), []);

  if (!configured) {
    return <p className="mt-2 text-xs text-faint">{t('github.needsServer')}</p>;
  }
  return (
    <div className="mt-3 flex flex-col gap-2">
      {board.github && (
        <p className="text-xs text-muted">
          {t('github.mirrors')}{' '}
          <a
            href={board.github.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {board.github.owner} · Project #{board.github.number}
          </a>
          {t('github.mirrorsColumns')}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {user ? (
          <>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <img src={user.avatarUrl} alt="" className="size-4 rounded-sm" />
              {user.login}
            </span>
            {!board.github && (
              <Button size="sm" variant="primary" onClick={() => setPicking(true)}>
                {t('github.openProject')}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => void useGithub.getState().signOut()}>
              {t('conn.disconnect')}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="primary"
            disabled={busy}
            onClick={() => void useGithub.getState().signIn()}
          >
            {busy ? t('common.connecting') : t('github.connect')}
          </Button>
        )}
      </div>
      <GithubProjectsModal open={picking} onClose={() => setPicking(false)} />
    </div>
  );
}
