/**
 * App languages (story 25): Spanish (the source language), English and Korean.
 *
 * - Every text lives in a dictionary per language (`locales/`). Spanish is the
 *   source: the other dictionaries are typed against it, so a missing or extra
 *   key is a compile error, never a blank label at runtime.
 * - A "pack" is everything that depends on the language: the texts and the
 *   board templates (their columns and example cards are written per language).
 *   Spanish ships in the main bundle; English and Korean load on demand, the
 *   first time they are needed (before the first render when they are the
 *   starting language).
 * - The language is picked from the browser on the first visit (Spanish,
 *   Korean, otherwise English, the most widely read) and can be changed from
 *   the top bar. The choice is remembered in this browser.
 *
 * Views call `useT()` so they re-render when the language changes; code outside
 * React (controllers, dialogs, errors) calls `t()` directly.
 *
 * Cross-cutting base module like design/motion: it has no business logic, so
 * design components can use it too.
 */
import { create } from 'zustand';
import type { BoardTemplate } from '../templates/model';
import { es, type MessageKey, type Messages } from './locales/es';
import { TEMPLATES_ES } from '../templates/locales/es';

export type { MessageKey, Messages } from './locales/es';

export const LOCALES = ['es', 'en', 'ko'] as const;
export type Locale = (typeof LOCALES)[number];

/** Each language written in itself, so everyone finds their own in the menu. */
export const LOCALE_NAMES: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  ko: '한국어',
};

/** Everything that changes with the language. */
export interface LocalePack {
  messages: Messages;
  templates: readonly BoardTemplate[];
}

const ES_PACK: LocalePack = { messages: es, templates: TEMPLATES_ES };

const loaders: Record<Exclude<Locale, 'es'>, () => Promise<LocalePack>> = {
  en: () => import('./locales/en').then((m) => m.pack),
  ko: () => import('./locales/ko').then((m) => m.pack),
};

const STORAGE_KEY = 'devbord:lang';

const isLocale = (v: unknown): v is Locale =>
  typeof v === 'string' && (LOCALES as readonly string[]).includes(v);

/**
 * The first browser language DuckBord speaks ("es-MX" counts as Spanish),
 * or English when none matches.
 */
export function detectLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLocale(base)) return base;
  }
  return 'en';
}

export type Vars = Record<string, string | number>;

/** Fills `{name}` placeholders; unknown ones are left as they are. */
export function fill(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (all, name: string) =>
    name in vars ? String(vars[name]) : all,
  );
}

/** Keys that come in plural forms: `x_one` and `x_other`. */
export type PluralKey = MessageKey extends infer K
  ? K extends `${infer Base}_other`
    ? Base
    : never
  : never;

export interface Translator {
  (key: MessageKey, vars?: Vars): string;
  /**
   * Plural text for `count` (`{n}` is filled in): "1 tarjeta" / "3 tarjetas".
   * Korean has a single form, so it always uses `_other`.
   */
  n: (key: PluralKey, count: number, vars?: Vars) => string;
  /** The language this translator speaks (for Intl formatters). */
  locale: Locale;
}

/** Builds the translator of one language. Pure: used directly by tests. */
export function makeTranslator(locale: Locale, messages: Messages): Translator {
  const rules = new Intl.PluralRules(locale);
  const t = ((key, vars) => fill(messages[key], vars)) as Translator;
  t.n = (key, count, vars) => {
    const form = rules.select(count) === 'one' ? `${key}_one` : `${key}_other`;
    const text =
      (messages as Record<string, string>)[form] ?? messages[`${key}_other` as MessageKey];
    return fill(text, { n: count, ...vars });
  };
  t.locale = locale;
  return t;
}

interface LocaleState extends LocalePack {
  locale: Locale;
  t: Translator;
  /** Loads the language (if needed), switches the whole app to it and remembers it. */
  setLocale: (locale: Locale) => Promise<void>;
}

const readStored = (): Locale | null => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isLocale(v) ? v : null;
  } catch {
    return null; // storage blocked: detect every time
  }
};

export const useLocale = create<LocaleState>((set, get) => ({
  locale: 'es',
  ...ES_PACK,
  t: makeTranslator('es', es),

  setLocale: async (locale) => {
    let pack = ES_PACK;
    if (locale !== 'es') {
      try {
        pack = await loaders[locale]();
      } catch {
        return; // chunk not reachable (offline): keep the current language
      }
    }
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* storage blocked: the choice lasts for this visit */
    }
    document.documentElement.lang = locale;
    if (get().locale === locale && get().messages === pack.messages) return;
    set({ locale, ...pack, t: makeTranslator(locale, pack.messages) });
  },
}));

/**
 * Picks the starting language (saved choice, else the browser's) and loads it.
 * Awaited before the first render, so the app never flashes in Spanish.
 */
export function initLocale(): Promise<void> {
  const nav = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]);
  return useLocale.getState().setLocale(readStored() ?? detectLocale(nav));
}

/** The translator of the current language, for views (re-renders on change). */
export const useT = (): Translator => useLocale((s) => s.t);

/** The translator of the current language, for code outside React. */
export const t = ((key, vars) => useLocale.getState().t(key, vars)) as Translator;
t.n = (key, count, vars) => useLocale.getState().t.n(key, count, vars);
// A getter, not a copy: the language can change after this module loads.
Object.defineProperty(t, 'locale', { get: () => useLocale.getState().locale });

const formats = new Map<string, Intl.DateTimeFormat>();

/** A date formatter in the current language (cached per language and options). */
export function dateFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const locale = useLocale.getState().locale;
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = formats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, options);
    formats.set(key, format);
  }
  return format;
}
