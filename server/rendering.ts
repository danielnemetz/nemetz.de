import { Eta } from 'eta';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Lang, LocaleDict, ModalKey } from '../src/lib/types.js';
import { MODALS } from '../src/lib/types.js';
import { DEFAULT_LANG, buildLocalizedPath, getBasePathForKey } from '../src/lib/routing.js';
import { getTranslationValue } from '../src/lib/i18n-utils.js';
import { isDev, templateFile, localeDir, getBuildId } from './config.js';
import { loadManifest, getAssets, getManifest } from './manifest.js';

// Single Eta instance – auto-escape HTML and cache templates in production
const eta = new Eta({ autoEscape: true, cache: !isDev });

export type TemplateContext = {
  lang: Lang;
  initialDialog: ModalKey | null;
  t: (key: string) => string;
  pathFor: (key: ModalKey | null) => string;
  langPathFor: (targetLang: Lang, key: ModalKey | null) => string;
  initialStateJson: string;
  MODALS: typeof MODALS;
  buildId: string;
  assets: {
    script: string;
    css: string | null;
  };
  isDev: boolean;
};

const templateCache: { value: string | null } = { value: null };
const localeCache = new Map<Lang, LocaleDict>();

async function loadTemplateString(): Promise<string> {
  return await fs.readFile(templateFile, 'utf8');
}

export async function getTemplate(): Promise<string> {
  if (isDev) {
    return loadTemplateString();
  }
  if (!templateCache.value) {
    templateCache.value = await loadTemplateString();
  }
  return templateCache.value;
}

export async function loadLocale(lang: Lang): Promise<LocaleDict> {
  if (!isDev && localeCache.has(lang)) {
    return localeCache.get(lang)!;
  }
  const filePath = path.join(localeDir, `${lang}.json`);
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw) as LocaleDict;
  if (!isDev) {
    localeCache.set(lang, parsed);
  }
  return parsed;
}

export async function renderPage({
  lang,
  dialog,
  basePath,
}: {
  lang: Lang;
  dialog: ModalKey | null;
  basePath: string;
}): Promise<string> {
  const template = await getTemplate();
  const locale = await loadLocale(lang);
  const fallback = lang === DEFAULT_LANG ? locale : await loadLocale(DEFAULT_LANG);

  // Ensure manifest is loaded in prod
  if (!isDev && !getManifest()) {
    await loadManifest();
  }

  const translator = (key: string): string =>
    getTranslationValue(locale, key) ?? getTranslationValue(fallback, key) ?? '';

  const context: TemplateContext = {
    lang,
    initialDialog: dialog,
    t: translator,
    pathFor: (key) => buildLocalizedPath(lang, getBasePathForKey(key)),
    langPathFor: (targetLang, key) => buildLocalizedPath(targetLang, getBasePathForKey(key)),
    initialStateJson: JSON.stringify({
      lang,
      dialog,
      path: buildLocalizedPath(lang, basePath),
    }),
    MODALS,
    buildId: getBuildId(),
    assets: getAssets(),
    isDev,
  };

  const rendered = eta.renderString(template, context);
  return rendered;
}

export async function render404Page(lang: Lang): Promise<string> {
  const template = await getTemplate();
  const locale = await loadLocale(lang);
  const fallback = lang === DEFAULT_LANG ? locale : await loadLocale(DEFAULT_LANG);

  if (!isDev && !getManifest()) {
    await loadManifest();
  }

  const translator = (key: string): string =>
    getTranslationValue(locale, key) ?? getTranslationValue(fallback, key) ?? '';

  const context: TemplateContext & { is404: boolean } = {
    lang,
    initialDialog: null,
    t: translator,
    pathFor: (key) => buildLocalizedPath(lang, getBasePathForKey(key)),
    langPathFor: (targetLang, key) => buildLocalizedPath(targetLang, getBasePathForKey(key)),
    initialStateJson: JSON.stringify({
      lang,
      dialog: null,
      path: buildLocalizedPath(lang, '/'),
    }),
    MODALS,
    buildId: getBuildId(),
    assets: getAssets(),
    isDev,
    is404: true,
  };

  return eta.renderString(template, context);
}
