// ==========================================================================
// Types and Constants
// ==========================================================================

export type ModalKey = 'about' | 'imprint';
export type Lang = 'de' | 'en';
export type LocaleDict = Record<string, unknown>;

export interface ModalDef {
  id: string;
  path: string;
}

export interface OpenDialogOptions {
  updateUrl?: boolean;
  key?: ModalKey;
}

export interface CloseDialogOptions {
  updateUrl?: boolean;
}

export interface SetLanguageOptions {
  syncUrl?: boolean;
}

export const OPEN_ATTR = 'data-open-dialog';
export const MODALS: Record<ModalKey, ModalDef> = {
  about: { id: 'about-dialog', path: '/about' },
  imprint: { id: 'imprint-dialog', path: '/imprint' },
};
