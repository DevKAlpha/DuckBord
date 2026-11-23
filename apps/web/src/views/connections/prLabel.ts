import type { PullRequestRef } from '@devbord/shared';
import { t } from '../../i18n';

/** Pull request state in words, in the current language. */
export const prLabel = (pr: PullRequestRef) =>
  pr.state === 'merged'
    ? t('github.merged')
    : pr.state === 'closed'
      ? t('github.closed')
      : pr.draft
        ? t('github.prDraft')
        : t('github.open');
