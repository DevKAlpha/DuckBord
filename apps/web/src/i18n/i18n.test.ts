import { describe, expect, it } from 'vitest';
import { detectLocale, fill, makeTranslator, useLocale } from './index';
import { es } from './locales/es';
import { en } from './locales/en';
import { ko } from './locales/ko';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('language detection', () => {
  it('picks the first browser language DuckBord speaks, by base language', () => {
    expect(detectLocale(['es-MX', 'en-US'])).toBe('es');
    expect(detectLocale(['ko-KR'])).toBe('ko');
    expect(detectLocale(['fr-FR', 'en-GB'])).toBe('en');
  });

  it('falls back to English when no language matches', () => {
    expect(detectLocale(['fr-FR', 'de'])).toBe('en');
    expect(detectLocale([])).toBe('en');
  });
});

describe('translator', () => {
  it('fills placeholders and leaves unknown ones', () => {
    expect(fill('Hola {name}', { name: 'Ana' })).toBe('Hola Ana');
    expect(fill('Hola {name}')).toBe('Hola {name}');
  });

  it('chooses the plural form of each language', () => {
    expect(makeTranslator('es', es).n('home.cards', 1)).toBe('1 tarjeta');
    expect(makeTranslator('es', es).n('home.cards', 3)).toBe('3 tarjetas');
    expect(makeTranslator('en', en).n('home.cards', 1)).toBe('1 card');
    expect(makeTranslator('ko', ko).n('home.cards', 1)).toBe('카드 1개');
  });

  it('starts in Spanish, the source language', () => {
    expect(useLocale.getState().locale).toBe('es');
    expect(useLocale.getState().t('common.cancel')).toBe('Cancelar');
  });

  it('switches the whole app to another language', async () => {
    await useLocale.getState().setLocale('ko');
    expect(useLocale.getState().t('common.cancel')).toBe('취소');
    expect(useLocale.getState().templates.find((t) => t.id === 'blank')?.name).toBe('빈 보드');
    expect(document.documentElement.lang).toBe('ko');
    await useLocale.getState().setLocale('es');
    expect(useLocale.getState().t('common.cancel')).toBe('Cancelar');
  });
});

describe('dictionaries', () => {
  it.each([
    ['en', en],
    ['ko', ko],
  ] as const)('%s uses the same placeholders as Spanish in every text', (_l, messages) => {
    for (const key of Object.keys(es) as (keyof typeof es)[]) {
      expect([key, placeholders(messages[key])]).toEqual([key, placeholders(es[key])]);
    }
  });

  it.each([
    ['en', en],
    ['ko', ko],
  ] as const)('%s has no empty texts', (_l, messages) => {
    for (const [key, text] of Object.entries(messages))
      expect([key, text.trim()]).not.toEqual([key, '']);
  });
});
