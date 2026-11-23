import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { BoardMode, BoardSkin, Profile } from '@devbord/shared';
import { Button, Field, Input, cx } from '../../design';
import { useBoardController } from '../../controllers/boardController';
import { usePreferences } from '../../controllers/preferencesController';
import { buildBoardFromTemplate, getTemplate, templatesFor } from '../../templates';
import { Logo } from '../components/Logo';
import { ModePicker, ProfilePicker, SkinPicker, TemplatePicker } from '../components/Pickers';
import { useT } from '../../i18n';

const STEPS = ['onboarding.stepProfile', 'onboarding.stepTemplate', 'onboarding.stepName'] as const;

/**
 * First-run flow: 3 short steps, every one with a sensible default, and a
 * "skip" exit at all times. The goal is a useful board in under 10 seconds.
 */
export function OnboardingPage() {
  const navigate = useNavigate();
  const addBoard = useBoardController((s) => s.addBoard);
  const completeOnboarding = usePreferences((s) => s.completeOnboarding);
  const t = useT();

  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>('simple');
  const [templateId, setTemplateId] = useState(templatesFor('simple')[0]!.id);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<BoardMode>('personal');
  const [skin, setSkin] = useState<BoardSkin>('default');
  // A template with its own style (content creators: Sencillo) switches the
  // style picker too, so the form shows the board that will be created.
  const pickTemplate = (id: string) => {
    setTemplateId(id);
    const picked = getTemplate(id);
    if (picked?.lockedProfile) setProfile(picked.profile);
  };
  const template = getTemplate(templateId);

  const changeProfile = (p: Profile) => {
    setProfile(p);
    pickTemplate(templatesFor(p)[0]!.id);
  };

  const finish = async () => {
    if (!template) return;
    const board = await addBoard(buildBoardFromTemplate(template, { name, profile, mode, skin }));
    completeOnboarding(profile);
    navigate(`/b/${board.id}`, { replace: true });
  };

  const skip = () => {
    completeOnboarding(profile);
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5">
        <Link to="/" aria-label={t('shell.home')}>
          <Logo />
        </Link>
        <Button variant="ghost" size="sm" onClick={skip}>
          {t('onboarding.skip')}
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-10">
        {/* Pixel progress: one block per step. */}
        <ol className="flex gap-2" aria-label={t('onboarding.progress')}>
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 flex-col gap-1.5">
              <span
                className={cx(
                  'h-1.5 rounded-[2px] transition-colors',
                  i <= step ? 'bg-accent' : 'bg-surface-3',
                )}
              />
              <span
                className={i === step ? 'text-xs font-semibold' : 'text-xs text-muted'}
                aria-current={i === step ? 'step' : undefined}
              >
                {t(label)}
              </span>
            </li>
          ))}
        </ol>

        <section key={step} className="flex animate-pixel-pop flex-col gap-5">
          {step === 0 && (
            <>
              <div>
                <h1 className="text-3xl sm:text-4xl">{t('onboarding.hello')}</h1>
                <p className="mt-2 text-muted">{t('onboarding.helloBody')}</p>
              </div>
              <ProfilePicker value={profile} onChange={changeProfile} />
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <h1 className="text-3xl">{t('onboarding.start')}</h1>
                <p className="mt-2 text-muted">{t('onboarding.startBody')}</p>
              </div>
              <TemplatePicker
                templates={templatesFor(profile)}
                value={templateId}
                onChange={pickTemplate}
              />
              <h2 className="-mb-3 text-xs font-semibold tracking-wide text-muted uppercase">
                {t('newBoard.skin')}
              </h2>
              <SkinPicker value={skin} onChange={setSkin} />
            </>
          )}

          {step === 2 && (
            <form
              id="onboarding-name"
              className="flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                void finish();
              }}
            >
              <div>
                <h1 className="text-3xl">{t('newBoard.forWhom')}</h1>
                <p className="mt-2 text-muted">{t('onboarding.modeBody')}</p>
              </div>
              <ModePicker value={mode} onChange={setMode} />
              <Field label={t('board.name')} htmlFor="onboarding-board-name">
                <Input
                  id="onboarding-board-name"
                  autoFocus
                  maxLength={80}
                  placeholder={template?.name}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
            </form>
          )}
        </section>

        <footer className="mt-auto flex items-center justify-between gap-3 pt-4">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            {t('onboarding.back')}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="primary" onClick={() => setStep((s) => s + 1)}>
              {t('onboarding.next')}
            </Button>
          ) : (
            <Button type="submit" form="onboarding-name" variant="primary">
              {t('onboarding.create')}
            </Button>
          )}
        </footer>
      </main>
    </div>
  );
}
