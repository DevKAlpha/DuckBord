import { useState } from 'react';
import { Button, Field, Input, Modal } from '../../design';
import { useIdentity } from '../../controllers/identityController';
import { Avatar } from './TeamBar';
import { useT } from '../../i18n';

/**
 * Asks for a display name the first time someone opens a team board, so
 * teammates see who is who (name on the cursor and the avatar).
 */
export function NamePrompt() {
  const name = useIdentity((s) => s.name);
  const color = useIdentity((s) => s.color);
  const setName = useIdentity((s) => s.setName);
  const [draft, setDraft] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const t = useT();

  const save = (value: string) => {
    setName(value.trim() || t('common.guest'));
    setDismissed(true);
  };

  return (
    <Modal open={!name && !dismissed} title={t('name.title')} onClose={() => save(draft)}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save(draft);
        }}
      >
        <p className="text-sm text-muted">{t('name.body')}</p>
        <div className="flex items-end gap-3">
          <Avatar name={draft || '?'} color={color} />
          <div className="flex-1">
            <Field label={t('name.label')} htmlFor="identity-name">
              <Input
                id="identity-name"
                autoFocus
                data-autofocus
                maxLength={30}
                placeholder={t('name.placeholder')}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </Field>
          </div>
        </div>
        <Button type="submit" variant="primary" className="self-end">
          {t('name.enter')}
        </Button>
      </form>
    </Modal>
  );
}
