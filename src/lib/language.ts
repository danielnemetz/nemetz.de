// ==========================================================================
// Language Management
// ==========================================================================

import type { Lang, SetLanguageOptions } from './types';
import { currentKey, setCurrentLang } from './state';
import { MODALS } from './types';

export function getLangFromUrl(): Lang | null {
  const params = new URLSearchParams(location.search);
  const lang = params.get('lang');
  if (lang === 'de' || lang === 'en') {
    return lang;
  }
  return null;
}

export function getBrowserDefaultLang(): Lang {
  const nav = navigator as Navigator & {
    userLanguage?: string;
    browserLanguage?: string;
  };
  const candidates =
    navigator.languages?.length > 0
      ? navigator.languages
      : [navigator.language, nav.userLanguage, nav.browserLanguage].filter(Boolean);
  return candidates.some((lang) =>
    String(lang ?? '')
      .toLowerCase()
      .startsWith('de'),
  )
    ? 'de'
    : 'en';
}

export function setLanguage(lang: Lang, options: SetLanguageOptions = {}): void {
  const { syncUrl = false } = options;
  if (lang !== 'de' && lang !== 'en') {
    return;
  }
  setCurrentLang(lang);
  localStorage.setItem('lang', lang);
  if (syncUrl && currentKey) {
    const def = MODALS[currentKey];
    const url = new URL(location.href);
    url.pathname = def.path;
    url.searchParams.set('lang', lang);
    history.replaceState({ modal: currentKey }, '', url.toString());
  }
}
