// ==========================================================================
// Dialog Operations
// ==========================================================================

import type { ModalKey, OpenDialogOptions, CloseDialogOptions } from './types';
import { currentKey, lastFocused, setCurrentKey, setLastFocused } from './state';
import { showDialog, hideDialog, getDialog } from './dialog';
import { pushPathFor, replaceToRootIfPathMatches } from './routing';
import { renderModal } from './rendering';
import { OPEN_ATTR, MODALS } from './types';

export function openDialog(event: Event | null, options: OpenDialogOptions = {}): void {
  const { updateUrl = true, key } = options;
  if (event && event.preventDefault) {
    event.preventDefault();
  }
  let dialogKey: ModalKey | null = key ?? null;
  if (!dialogKey && event && event.currentTarget instanceof HTMLElement) {
    const attr = event.currentTarget.getAttribute(OPEN_ATTR);
    dialogKey = (attr === 'about' || attr === 'imprint' ? attr : null) as ModalKey | null;
  }
  if (!dialogKey || !MODALS[dialogKey]) {
    return;
  }
  setLastFocused(document.activeElement as HTMLElement | null);
  setCurrentKey(dialogKey);
  showDialog(dialogKey);
  void renderModal(dialogKey);
  if (updateUrl === true) {
    pushPathFor(dialogKey);
  }
}

export function closeDialog(options: CloseDialogOptions = {}): void {
  const { updateUrl = true } = options;
  if (!currentKey) {
    return;
  }
  hideDialog(currentKey);
  if (lastFocused && typeof lastFocused.focus === 'function') {
    lastFocused.focus();
  }
  if (updateUrl === true) {
    replaceToRootIfPathMatches(currentKey);
  }
  setCurrentKey(null);
}

export function handleBackdropClick(key: ModalKey, e: MouseEvent): void {
  const dlg = getDialog(key);
  if (!dlg || e.target === dlg) {
    closeDialog({ updateUrl: true });
  }
}
