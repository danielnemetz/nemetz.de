// ==========================================================================
// Routing and History
// ==========================================================================

import type { ModalKey } from './types';
import { MODALS } from './types';

export function getKeyByPath(pathname: string): ModalKey | null {
  const entry = Object.entries(MODALS).find(([, def]) => pathname === def.path);
  return (entry ? entry[0] : null) as ModalKey | null;
}

export function pushPathFor(key: ModalKey): void {
  const def = MODALS[key];
  if (!def) {
    return;
  }
  if (location.pathname !== def.path) {
    history.pushState({ modal: key }, '', def.path);
  }
}

export function replaceToRootIfPathMatches(key: ModalKey): void {
  const def = MODALS[key];
  if (!def) {
    return;
  }
  if (location.pathname === def.path) {
    history.replaceState({}, '', '/');
  }
}
