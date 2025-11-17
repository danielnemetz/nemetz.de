// ==========================================================================
// Rendering
// ==========================================================================

import type { ModalKey } from './types';
import { currentLang } from './state';
import { getDialog } from './dialog';
import { loadLocale } from './i18n';

export function updateLangToggles(dlg: HTMLDialogElement): void {
    dlg.querySelectorAll('.lang-toggle').forEach((b) => {
        const lang = b.getAttribute('data-lang');
        b.setAttribute('aria-pressed', String(lang === currentLang));
    });
}

export async function renderModal(key: ModalKey): Promise<void> {
    const dict = await loadLocale(currentLang);
    const dlg = getDialog(key);
    if (!dict || !dlg) {
        return;
    }
    dlg.setAttribute('lang', currentLang);
    dlg.querySelectorAll('[data-i18n]').forEach((el) => {
        if (!(el instanceof HTMLElement)) {
            return;
        }
        const path = el.getAttribute('data-i18n');
        if (!path) {
            return;
        }
        const parts = path.split('.');
        let node: unknown = dict;
        for (const p of parts) {
            if (node && typeof node === 'object' && !Array.isArray(node)) {
                node = (node as Record<string, unknown>)[p];
            }
        }
        if (typeof node === 'string') {
            if (node.includes('<')) {
                el.innerHTML = node;
            } else {
                el.textContent = node;
            }
        }
    });
    updateLangToggles(dlg);
}

