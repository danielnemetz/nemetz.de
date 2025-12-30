// ==========================================================================
// Rendering
// ==========================================================================

import type { ModalKey } from './types';
import { currentLang } from './state';
import { getDialog } from './dialog';
import { loadLocale } from './i18n';
import { getTranslationValue } from './i18n-utils';
import { splitLocalizedPath, buildLocalizedPath } from './routing';

export function updateLangToggles(container: HTMLElement | Document = document): void {
  container.querySelectorAll('.lang-toggle').forEach((b) => {
    const lang = b.getAttribute('data-lang');
    b.setAttribute('aria-current', lang === currentLang ? 'page' : 'false');
  });
}

function updateLinks(container: HTMLElement | Document = document): void {
  container.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) return;

    // Skip external links, anchors, mailto, tel
    if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }

    const { lang, basePath } = splitLocalizedPath(href);
    // Only update if it looks like a localized path (has a lang prefix)
    if (lang) {
      const newHref = buildLocalizedPath(currentLang, basePath);
      if (newHref !== href) {
        a.setAttribute('href', newHref);
      }
    }
  });
}

function translateElement(el: HTMLElement, dict: Record<string, unknown>): void {
  const path = el.getAttribute('data-i18n');
  if (!path) {
    return;
  }
  const value = getTranslationValue(dict, path);
  if (!value) {
    return;
  }
  if (value.includes('<')) {
    el.innerHTML = value;
  } else {
    el.textContent = value;
  }
}

export async function renderPage(): Promise<void> {
  const dict = await loadLocale(currentLang);
  if (!dict) {
    return;
  }
  document.documentElement.setAttribute('lang', currentLang);
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    if (el instanceof HTMLElement) {
      translateElement(el, dict);
    }
  });
  updateLangToggles();
  updateLinks();
}

export async function renderModal(key: ModalKey): Promise<void> {
  const dict = await loadLocale(currentLang);
  const dlg = getDialog(key);
  if (!dict || !dlg) {
    return;
  }
  dlg.setAttribute('lang', currentLang);
  dlg.querySelectorAll('[data-i18n]').forEach((el) => {
    if (el instanceof HTMLElement) {
      translateElement(el, dict);
    }
  });
  updateLangToggles(dlg);
  updateLinks(dlg);
}
