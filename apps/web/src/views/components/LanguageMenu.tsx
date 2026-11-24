/**
 * Language picker in the top bar (story 25). A native <select> layered over a
 * pixel chip, like the board switcher: keyboard, screen readers and mobile
 * pickers work for free. Each language is written in itself.
 */
import { PixelIcon } from '../../design';
import { LOCALES, LOCALE_NAMES, useLocale, useT, type Locale } from '../../i18n';

export function LanguageMenu() {
  const locale = useLocale((s) => s.locale);
  const t = useT();
  return (
    <span className="relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm text-muted hover:bg-surface-3/70 hover:text-ink">
      <PixelIcon name="globe" />
      <span className="font-pixel uppercase">{locale}</span>
      <select
        aria-label={t('shell.language')}
        className="lang-select absolute inset-0 cursor-pointer opacity-0"
        value={locale}
        onChange={(e) => void useLocale.getState().setLocale(e.target.value as Locale)}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </span>
  );
}
