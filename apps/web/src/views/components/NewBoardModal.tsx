import { useState } from 'react';
import type { BoardMode, BoardSkin, Profile } from '@devbord/shared';
import { Button, Field, Input, Modal } from '../../design';
import { useBoardController } from '../../controllers/boardController';
import { usePreferences } from '../../controllers/preferencesController';
import { buildBoardFromTemplate, getTemplate, templatesFor } from '../../templates';
import { useT } from '../../i18n';
import { ModePicker, ProfilePicker, SkinPicker, TemplatePicker } from './Pickers';

export interface NewBoardModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (boardId: string) => void;
}

/**
 * Board creation: personal or team, profile, template, then the look and the
 * name (required) at the bottom. Sensible defaults everywhere else.
 */
export function NewBoardModal({ open, onClose, onCreated }: NewBoardModalProps) {
  const t = useT();
  return (
    <Modal open={open} title={t('newBoard.title')} onClose={onClose}>
      {/* Mounted only while open, so every opening starts from fresh defaults. */}
      {open && <NewBoardForm onClose={onClose} onCreated={onCreated} />}
    </Modal>
  );
}

function NewBoardForm({ onClose, onCreated }: Omit<NewBoardModalProps, 'open'>) {
  const addBoard = useBoardController((s) => s.addBoard);
  const t = useT();
  const preferred = usePreferences((s) => s.profile);
  const [profile, setProfile] = useState<Profile>(preferred);
  const [templateId, setTemplateId] = useState(templatesFor(preferred)[0]!.id);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<BoardMode>('personal');
  const [skin, setSkin] = useState<BoardSkin>('default');
  const [error, setError] = useState<string | null>(null);
  // A template with its own style (content creators: Sencillo) switches the
  // style picker too, so the form shows the board that will be created.
  const pickTemplate = (id: string) => {
    setTemplateId(id);
    const picked = getTemplate(id);
    if (picked?.lockedProfile) setProfile(picked.profile);
  };

  const changeProfile = (p: Profile) => {
    setProfile(p);
    pickTemplate(templatesFor(p)[0]!.id);
  };
  const template = getTemplate(templateId);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!template || !name.trim()) return;
        try {
          const board = await addBoard(
            buildBoardFromTemplate(template, { name, profile, mode, skin }),
          );
          onClose();
          onCreated(board.id);
        } catch (err) {
          // e.g. BoardLimitError: its message says what to do.
          setError(err instanceof Error ? err.message : t('newBoard.error'));
        }
      }}
    >
      <h3 className="-mb-3 text-xs font-semibold tracking-wide text-muted uppercase">
        {t('newBoard.forWhom')}
      </h3>
      <ModePicker value={mode} onChange={setMode} />
      <h3 className="-mb-3 text-xs font-semibold tracking-wide text-muted uppercase">
        {t('newBoard.style')}
      </h3>
      <ProfilePicker value={profile} onChange={changeProfile} />
      <h3 className="-mb-3 text-xs font-semibold tracking-wide text-muted uppercase">
        {t('newBoard.template')}
      </h3>
      <TemplatePicker
        templates={templatesFor(profile)}
        value={templateId}
        onChange={pickTemplate}
      />
      <h3 className="-mb-3 text-xs font-semibold tracking-wide text-muted uppercase">
        {t('newBoard.skin')}
      </h3>
      <SkinPicker value={skin} onChange={setSkin} />
      <Field label={t('newBoard.name')} htmlFor="board-name">
        <Input
          id="board-name"
          required
          maxLength={80}
          placeholder={t('newBoard.placeholder', {
            name: template?.name ?? t('newBoard.defaultName'),
          })}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button type="submit" variant="primary" disabled={!name.trim()}>
          {t('newBoard.create')}
        </Button>
      </div>
    </form>
  );
}
