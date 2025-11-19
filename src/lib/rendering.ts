// ==========================================================================
// Rendering
// ==========================================================================

import type { ModalKey } from './types';
import { currentLang } from './state';
import { getDialog } from './dialog';
import { loadLocale } from './i18n';
import { getTranslationValue } from './i18n-utils';

export function updateLangToggles(container: HTMLElement | Document = document): void {
  container.querySelectorAll('.lang-toggle').forEach((b) => {
    const lang = b.getAttribute('data-lang');
    b.setAttribute('aria-current', lang === currentLang ? 'page' : 'false');
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
}
