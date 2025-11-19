// ==========================================================================
// Shared i18n Helpers
// ==========================================================================
export function getTranslationValue(dict, path) {
  const parts = path.split('.');
  let node = dict;
  for (const key of parts) {
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      node = node[key];
    } else {
      return null;
    }
  }
  return typeof node === 'string' ? node : null;
}
