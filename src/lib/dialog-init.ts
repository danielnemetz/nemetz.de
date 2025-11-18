// ==========================================================================
// Dialog Initialization
// ==========================================================================

import type { ModalKey } from './types';
import { OPEN_ATTR } from './types';
import { getDialog } from './dialog';
import { closeDialog, handleBackdropClick, openDialog } from './dialog-operations';
import { setLanguage } from './language';
import { renderModal } from './rendering';
import { initToolbarArrowNav } from './accessibility';

export function initOpeners(): void {
  document.querySelectorAll(`[${OPEN_ATTR}]`).forEach((el) => {
    el.addEventListener('click', (e) => openDialog(e));
  });
}

export function initDialogEventsFor(key: ModalKey): void {
  const dlg = getDialog(key);
  if (!dlg) {
    return;
  }
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeDialog({ updateUrl: true });
  });
  dlg.addEventListener('click', (e) => handleBackdropClick(key, e));
  dlg.querySelectorAll('button[value="close"]').forEach((btn) => {
    btn.addEventListener('click', () => closeDialog({ updateUrl: true }));
  });
  const toolbar = dlg.querySelector('.dialog-actions');
  if (toolbar instanceof HTMLElement) {
    initToolbarArrowNav(toolbar);
  }
  dlg.querySelectorAll('.lang-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang');
      if (lang === 'de' || lang === 'en') {
        setLanguage(lang, { syncUrl: true });
        void renderModal(key);
      }
    });
  });
}
