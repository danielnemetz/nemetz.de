// ==========================================================================
// Shared i18n Helpers
// ==========================================================================

import type { LocaleDict } from './types.js';

export function getTranslationValue(dict: LocaleDict, path: string): string | null {
    const parts = path.split('.');
    let node: unknown = dict;
    for (const key of parts) {
        if (node && typeof node === 'object' && !Array.isArray(node)) {
            node = (node as Record<string, unknown>)[key];
        } else {
            return null;
        }
    }
    return typeof node === 'string' ? node : null;
}
