// ==========================================================================
// Routing and History
// ==========================================================================

import type { Lang, ModalKey } from './types.js';
import { MODALS } from './types.js';
import { currentLang } from './state.js';

export const SUPPORTED_LANGS: readonly Lang[] = ['de', 'en'];
export const DEFAULT_LANG: Lang = 'en';

export function getKeyByPath(pathname: string): ModalKey | null {
  const entry = Object.entries(MODALS).find(([, def]) => pathname === def.path);
  return (entry ? entry[0] : null) as ModalKey | null;
}

function normalizeBasePath(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }
  let normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export function splitLocalizedPath(pathname: string): {
  lang: Lang | null;
  basePath: string;
} {
  const segments = pathname.split('/').filter(Boolean);
  const candidate = segments[0] as Lang | undefined;
  let lang: Lang | null = null;
  if (candidate && (SUPPORTED_LANGS as readonly string[]).includes(candidate)) {
    lang = candidate;
    segments.shift();
  }
  const basePath = normalizeBasePath(`/${segments.join('/')}`.replace('//', '/'));
  return { lang, basePath };
}

export function buildLocalizedPath(lang: Lang, basePath: string): string {
  const normalized = normalizeBasePath(basePath);
  return normalized === '/' ? `/${lang}` : `/${lang}${normalized}`;
}

export function getKeyByLocalizedPath(pathname: string): ModalKey | null {
  const { basePath } = splitLocalizedPath(pathname);
  return getKeyByPath(basePath);
}

export function getBasePathForKey(key: ModalKey | null): string {
  if (!key) {
    return '/';
  }
  const def = MODALS[key];
  return def?.path ?? '/';
}

export function pushPathFor(key: ModalKey, lang: Lang = currentLang): void {
  const target = buildLocalizedPath(lang, getBasePathForKey(key));
  if (location.pathname !== target) {
    history.pushState({ modal: key }, '', target);
  }
}

export function replaceToRootIfPathMatches(key: ModalKey, lang: Lang = currentLang): void {
  const target = buildLocalizedPath(lang, getBasePathForKey(key));
  if (location.pathname === target) {
    history.replaceState({}, '', buildLocalizedPath(lang, '/'));
  }
}
