// ==========================================================================
// Dialog Core Functions
// ==========================================================================

import type { ModalKey } from './types';
import { MODALS } from './types';

export function getDialog(key: ModalKey): HTMLDialogElement | null {
  const def = MODALS[key];
  if (!def) {
    return null;
  }
  return document.getElementById(def.id) as HTMLDialogElement | null;
}

export function showDialog(key: ModalKey): void {
  const dlg = getDialog(key);
  if (dlg && !dlg.open) {
    dlg.showModal();
    // Remove manual backdrop if it exists (server-side rendered)
    const manualBackdrop = document.querySelector(`.dialog-backdrop[data-backdrop-for="${dlg.id}"]`);
    if (manualBackdrop) {
      manualBackdrop.remove();
    }
  }
}

export function hideDialog(key: ModalKey): void {
  const dlg = getDialog(key);
  if (dlg && dlg.open) {
    dlg.close();
    // Remove manual backdrop if it exists
    const manualBackdrop = document.querySelector(`.dialog-backdrop[data-backdrop-for="${dlg.id}"]`);
    if (manualBackdrop) {
      manualBackdrop.remove();
    }
  }
}
