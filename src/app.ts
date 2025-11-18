// ==========================================================================
// Main Application Entry Point
// ==========================================================================

import './styles.scss';
import { MODALS } from './lib/types';
import type { ModalKey } from './lib/types';
import { initDialogEventsFor } from './lib/dialog-init';
import { initOpeners } from './lib/dialog-init';
import { initPopstateSync, initDeepLink } from './lib/routing-init';
import { initToolbarArrowNav } from './lib/accessibility';

function init(): void {
  (Object.keys(MODALS) as ModalKey[]).forEach(initDialogEventsFor);
  initOpeners();
  initPopstateSync();
  initDeepLink();
  const footerToolbar = document.querySelector('footer .contact[role="toolbar"]');
  if (footerToolbar instanceof HTMLElement) {
    initToolbarArrowNav(footerToolbar);
  }
}

init();
