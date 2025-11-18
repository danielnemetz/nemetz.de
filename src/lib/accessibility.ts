// ==========================================================================
// Accessibility - Keyboard Navigation
// ==========================================================================

export function initToolbarArrowNav(toolbarEl: HTMLElement): void {
  function getItems(): HTMLElement[] {
    return Array.from(toolbarEl.querySelectorAll('button:not([disabled]), a[href]')).filter(
      (el): el is HTMLElement => {
        if (!(el instanceof HTMLElement)) {
          return false;
        }
        const style = getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.tabIndex !== -1;
      },
    );
  }
  toolbarEl.addEventListener('keydown', (e: KeyboardEvent) => {
    const isLTR = getComputedStyle(document.documentElement).direction !== 'rtl';
    const prevKey = isLTR ? 'ArrowLeft' : 'ArrowRight';
    const nextKey = isLTR ? 'ArrowRight' : 'ArrowLeft';
    const keys = [prevKey, nextKey, 'Home', 'End'];
    if (!keys.includes(e.key)) {
      return;
    }
    const items = getItems();
    if (items.length === 0) {
      return;
    }
    const currentIndex = Math.max(0, items.indexOf(document.activeElement as HTMLElement));
    let nextIndex = currentIndex;
    if (e.key === nextKey) {
      nextIndex = (currentIndex + 1) % items.length;
    } else if (e.key === prevKey) {
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = items.length - 1;
    }
    if (nextIndex !== currentIndex) {
      e.preventDefault();
      items[nextIndex]?.focus();
    }
  });
}
