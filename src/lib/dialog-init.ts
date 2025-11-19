// ==========================================================================
// Dialog Initialization
// ==========================================================================

import type { ModalKey } from './types';
import { OPEN_ATTR } from './types';
import { getDialog } from './dialog';
import { closeDialog, handleBackdropClick, openDialog } from './dialog-operations';

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

  // Handle manual backdrop element for server-side rendered dialogs
  const backdrop = document.querySelector(`.dialog-backdrop[data-backdrop-for="${dlg.id}"]`);
  if (backdrop) {
    backdrop.addEventListener('click', () => closeDialog({ updateUrl: true }));
  }
}
