// ==========================================================================
// Global State
// ==========================================================================
export let currentKey = null;
export let lastFocused = null;
export let currentLang = 'en';
export const localeCache = {};
export function setCurrentKey(key) {
  currentKey = key;
}
export function setLastFocused(element) {
  lastFocused = element;
}
export function setCurrentLang(lang) {
  currentLang = lang;
}
