/**
 * Autocorrect per language (story 26). Each list is its own chunk, fetched the
 * first time someone types in that language.
 */
import type { Locale } from '../index';
import type { SpellPack } from './engine';

export { checkWord, WORD_END, type Check, type Edit, type Hint, type Reading } from './engine';
export type { SpellPack } from './engine';

const loaders: Record<Locale, () => Promise<{ pack: SpellPack }>> = {
  es: () => import('./es'),
  en: () => import('./en'),
  ko: () => import('./ko'),
};

const cache = new Map<Locale, Promise<SpellPack>>();

/** The autocorrect rules of a language (loaded once). */
export function loadSpellPack(locale: Locale): Promise<SpellPack> {
  let pack = cache.get(locale);
  if (!pack) {
    pack = loaders[locale]().then((m) => m.pack);
    // A failed fetch (offline) is retried next time instead of being cached.
    pack.catch(() => cache.delete(locale));
    cache.set(locale, pack);
  }
  return pack;
}
