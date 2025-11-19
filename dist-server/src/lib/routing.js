// ==========================================================================
// Routing and History
// ==========================================================================
import { MODALS } from './types.js';
import { currentLang } from './state.js';
export const SUPPORTED_LANGS = ['de', 'en'];
export const DEFAULT_LANG = 'en';
export function getKeyByPath(pathname) {
    const entry = Object.entries(MODALS).find(([, def]) => pathname === def.path);
    return (entry ? entry[0] : null);
}
function normalizeBasePath(pathname) {
    if (!pathname || pathname === '/') {
        return '/';
    }
    let normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
    if (normalized.length > 1 && normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
    }
    return normalized;
}
export function splitLocalizedPath(pathname) {
    const segments = pathname.split('/').filter(Boolean);
    const candidate = segments[0];
    let lang = null;
    if (candidate && SUPPORTED_LANGS.includes(candidate)) {
        lang = candidate;
        segments.shift();
    }
    const basePath = normalizeBasePath(`/${segments.join('/')}`.replace('//', '/'));
    return { lang, basePath };
}
export function buildLocalizedPath(lang, basePath) {
    const normalized = normalizeBasePath(basePath);
    return normalized === '/' ? `/${lang}` : `/${lang}${normalized}`;
}
export function getKeyByLocalizedPath(pathname) {
    const { basePath } = splitLocalizedPath(pathname);
    return getKeyByPath(basePath);
}
export function getBasePathForKey(key) {
    if (!key) {
        return '/';
    }
    const def = MODALS[key];
    return def?.path ?? '/';
}
export function pushPathFor(key, lang = currentLang) {
    const target = buildLocalizedPath(lang, getBasePathForKey(key));
    if (location.pathname !== target) {
        history.pushState({ modal: key }, '', target);
    }
}
export function replaceToRootIfPathMatches(key, lang = currentLang) {
    const target = buildLocalizedPath(lang, getBasePathForKey(key));
    if (location.pathname === target) {
        history.replaceState({}, '', buildLocalizedPath(lang, '/'));
    }
}
