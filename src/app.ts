// ==========================================================================
// Main Application Entry Point
// ==========================================================================

import './styles.scss';
import { MODALS } from './lib/types';
import type { ModalKey } from './lib/types';
import { initDialogEventsFor, initOpeners } from './lib/dialog-init';
import { initPopstateSync, initDeepLink } from './lib/routing-init';
import { initToolbarArrowNav } from './lib/accessibility';
import { setLanguage } from './lib/language';
import { renderPage, renderModal } from './lib/rendering';
import { currentKey } from './lib/state';

function init(): void {
  (Object.keys(MODALS) as ModalKey[]).forEach(initDialogEventsFor);
  initOpeners();
  initPopstateSync();
  initDeepLink();
  document
    .querySelectorAll<HTMLElement>('[role="toolbar"]')
    .forEach((toolbar) => initToolbarArrowNav(toolbar));

  // Initialize global language selector
  document.querySelectorAll<HTMLAnchorElement>('.lang-toggle').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const lang = link.getAttribute('data-lang');
      if (lang === 'de' || lang === 'en') {
        setLanguage(lang, { syncUrl: true });
        void renderPage();
        if (currentKey) {
          void renderModal(currentKey);
        }
      }
    });
  });

  // Initial page render
  void renderPage();
}

init();

const buildId = document.documentElement.dataset.buildId;
if (buildId) {
  console.info(`nemetz.de build ${buildId}`);
}

const buildInfo = document.querySelector<HTMLElement>('[data-build-info]');
if (buildInfo) {
  buildInfo.textContent = buildId ?? 'local-dev';
}
