// ==========================================================================
// Internationalization
// ==========================================================================

import type { Lang, LocaleDict } from './types';
import { localeCache } from './state';

export async function loadLocale(lang: Lang): Promise<LocaleDict> {
    if (localeCache[lang]) {
        return localeCache[lang];
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

