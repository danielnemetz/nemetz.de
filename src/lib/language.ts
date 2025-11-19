// ==========================================================================
// Language Management
// ==========================================================================

import type { Lang, SetLanguageOptions } from './types';
import { currentKey, setCurrentLang } from './state';
import { buildLocalizedPath, getBasePathForKey, splitLocalizedPath } from './routing';

export function getLangFromUrl(): Lang | null {
  const { lang } = splitLocalizedPath(location.pathname);
  if (lang) {
    return lang;
  }
  const params = new URLSearchParams(location.search);
  const requested = params.get('lang');
  if (requested === 'de' || requested === 'en') {
    return requested;
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
  // Update HTML lang attribute for accessibility (screen readers, browser features)
  document.documentElement.setAttribute('lang', lang);
  if (syncUrl) {
    // Get current basePath from URL, even if it's invalid (for 404 pages)
    const { basePath: currentBasePath } = splitLocalizedPath(location.pathname);
    // Only use currentKey if it's valid, otherwise keep the current basePath
    const basePath = currentKey ? getBasePathForKey(currentKey) : currentBasePath;
    const target = buildLocalizedPath(lang, basePath);
    if (location.pathname !== target) {
      history.replaceState({ modal: currentKey }, '', target);
    }
  }
}
