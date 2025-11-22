import type { Lang, ModalKey } from './lib/types';

declare global {
  interface Window {
    __INITIAL_STATE__?: {
      lang: Lang;
      dialog: ModalKey | null;
      path: string;
    };
    __INITIAL_I18N__?: Record<string, unknown>;
  }
}

export { };
