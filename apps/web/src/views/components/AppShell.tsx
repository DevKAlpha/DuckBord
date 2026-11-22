import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { IconButton } from '../../design';
import { useMotion } from '../../controllers/motionController';
import { useThemeController } from '../../controllers/themeController';
import { useT } from '../../i18n';
import { LanguageMenu } from './LanguageMenu';
import { Logo } from './Logo';

/**
 * Animations on or reduced. For machines where DuckBord feels heavy: lite mode
 * keeps every state visible but drops the decorative loops.
 */
function MotionToggle() {
  const lite = useMotion((s) => s.lite);
  const toggle = useMotion((s) => s.toggle);
  const t = useT();
  return (
    <IconButton
      icon="motion"
      label={lite ? t('shell.motionOn') : t('shell.motionOff')}
      aria-pressed={!lite}
      className={lite ? 'text-faint' : 'text-accent'}
      onClick={toggle}
    />
  );
}

/**
 * Light or dark. Hidden on a seasonal skin: those have one fixed look.
 */
function ThemeToggle() {
  const mode = useThemeController((s) => s.mode);
  const skin = useThemeController((s) => s.skin);
  const toggle = useThemeController((s) => s.toggleMode);
  const t = useT();
  if (skin !== 'default') return null;
  return (
    <IconButton
      icon={mode === 'dark' ? 'sun' : 'moon'}
      label={mode === 'dark' ? t('shell.themeLight') : t('shell.themeDark')}
      onClick={toggle}
    />
  );
}

/**
 * Application frame: a slim translucent top bar (logo + appearance toggles)
 * above the page content. No sidebar on purpose: the board gets the full
 * width and nothing competes with it for attention.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <div className="app-shell flex h-full flex-col bg-surface">
      <header className="sticky top-0 z-20 shrink-0 border-b border-line-soft bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4">
          {/* The logo is the way home: always back to the start screen (board list). */}
          <NavLink to="/" aria-label={t('shell.home')}>
            <Logo />
          </NavLink>
          <span className="flex-1" />
          <LanguageMenu />
          <MotionToggle />
          <ThemeToggle />
        </div>
      </header>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
