// ==========================================================================
// Internationalization
// ==========================================================================

import type { Lang, LocaleDict } from './types';
import { localeCache } from './state';

export async function loadLocale(lang: Lang): Promise<LocaleDict> {
  if (localeCache[lang]) {
    return localeCache[lang];
  }

  // Use inlined data from server if available
  if (window.__INITIAL_I18N__ && document.documentElement.lang === lang) {
    const data = window.__INITIAL_I18N__ as LocaleDict;
    localeCache[lang] = data;
    delete window.__INITIAL_I18N__; // Clear to avoid reusing on lang switch
    return data;
  }

  try {
    const res = await fetch(`/i18n/${lang}.json`, { cache: 'no-cache' });
    if (!res.ok) {
      throw new Error(`i18n load failed: ${res.status}`);
    }
    const data = (await res.json()) as LocaleDict;
    localeCache[lang] = data;
    return data;
  } catch (e) {
    console.error(e);
    if (lang !== 'en') {
      return loadLocale('en');
    }
    return {};
  }
}
