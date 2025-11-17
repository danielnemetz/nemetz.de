// ==========================================================================
// Global State
// ==========================================================================

import type { ModalKey, Lang, LocaleDict } from './types';

export let currentKey: ModalKey | null = null;
export let lastFocused: HTMLElement | null = null;
export let currentLang: Lang = 'en';
export const localeCache: Record<Lang, LocaleDict> = {} as Record<Lang, LocaleDict>;

export function setCurrentKey(key: ModalKey | null): void {
    currentKey = key;
}

export function setLastFocused(element: HTMLElement | null): void {
    lastFocused = element;
}

export function setCurrentLang(lang: Lang): void {
    currentLang = lang;
}

