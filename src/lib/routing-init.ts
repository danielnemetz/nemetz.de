// ==========================================================================
// Routing Initialization
// ==========================================================================

import { currentKey, setCurrentKey } from './state';
import { getKeyByPath } from './routing';
import { showDialog, hideDialog } from './dialog';
import { getLangFromUrl } from './language';
import { setLanguage } from './language';
import { getBrowserDefaultLang } from './language';
import { renderModal, renderPage } from './rendering';

export function initPopstateSync(): void {
  window.addEventListener('popstate', () => {
    const key = getKeyByPath(location.pathname);
    if (key) {
      setCurrentKey(key);
      showDialog(key);
      const lang = getLangFromUrl();
      if (lang) {
        setLanguage(lang, { syncUrl: false });
        void renderPage();
      }
      void renderModal(key);
    } else if (currentKey) {
      hideDialog(currentKey);
      setCurrentKey(null);
    }
  });
}

export function initDeepLink(): void {
  const key = getKeyByPath(location.pathname);
  const urlLang = getLangFromUrl();
  if (urlLang) {
    setLanguage(urlLang, { syncUrl: false });
  } else {
    const stored = localStorage.getItem('lang');
    if (stored === 'de' || stored === 'en') {
      setLanguage(stored, { syncUrl: false });
    } else {
      setLanguage(getBrowserDefaultLang(), { syncUrl: false });
    }
  }
  if (key) {
    setCurrentKey(key);
    showDialog(key);
    void renderModal(key);
  }
}
