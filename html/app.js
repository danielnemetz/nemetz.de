(() => {
    const OPEN_ATTR = 'data-open-dialog';
    const MODALS = {
        about:   { id: 'about-dialog',   path: '/about'   },
        imprint: { id: 'imprint-dialog', path: '/imprint' },
    };
    let currentKey = null;
    let lastFocused = null;

    function getDialog(key) {
        const def = MODALS[key];
        if (!def) { return null; }
        return document.getElementById(def.id);
    }

    function getKeyByPath(pathname) {
        for (const [key, def] of Object.entries(MODALS)) {
            if (pathname === def.path) { return key; }
        }
        return null;
    }

    function pushPathFor(key) {
        const def = MODALS[key];
        if (!def) { return; }
        if (location.pathname !== def.path) {
            history.pushState({ modal: key }, '', def.path);
        }
    }

    function replaceToRootIfPathMatches(key) {
        const def = MODALS[key];
        if (!def) { return; }
        if (location.pathname === def.path) {
            history.replaceState({}, '', '/');
        }
    }

    function showDialog(key) {
        const dlg = getDialog(key);
        if (dlg && !dlg.open) { dlg.showModal(); }
    }

    function hideDialog(key) {
        const dlg = getDialog(key);
        if (dlg && dlg.open) { dlg.close(); }
    }

    function openDialog(event, { updateUrl = true, key } = {}) {
        if (event && event.preventDefault) { event.preventDefault(); }
        if (!key && event && event.currentTarget) {
            key = event.currentTarget.getAttribute(OPEN_ATTR);
        }
        if (!key || !MODALS[key]) { return; }
        lastFocused = document.activeElement;
        currentKey = key;
        showDialog(key);
        if (updateUrl === true) { pushPathFor(key); }
    }

    function closeDialog({ updateUrl = true } = {}) {
        if (!currentKey) { return; }
        hideDialog(currentKey);
        if (lastFocused && (typeof lastFocused.focus === 'function')) {
            lastFocused.focus();
        }
        if (updateUrl === true) { replaceToRootIfPathMatches(currentKey); }
        currentKey = null;
    }

    function handleBackdropClick(key, e) {
        const dlg = getDialog(key);
        if (!dlg) { return; }
        const rect = dlg.getBoundingClientRect();
        const inside = (
            (e.clientX >= rect.left) &&
            (e.clientX <= rect.right) &&
            (e.clientY >= rect.top) &&
            (e.clientY <= rect.bottom)
        );
        if (!inside) { closeDialog({ updateUrl: true }); }
    }

    function initOpeners() {
        document.querySelectorAll(`[${OPEN_ATTR}]`).forEach((el) => {
            el.addEventListener('click', (e) => openDialog(e));
        });
    }

    function initDialogEventsFor(key) {
        const dlg = getDialog(key);
        if (!dlg) { return; }
        dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeDialog({ updateUrl: true }); });
        dlg.addEventListener('click', (e) => handleBackdropClick(key, e));
        dlg.querySelectorAll('button[value="close"]').forEach((btn) => {
            btn.addEventListener('click', () => closeDialog({ updateUrl: true }));
        });
        const toolbar = dlg.querySelector('.dialog-actions');
        if (toolbar) { initToolbarArrowNav(toolbar); }
    }

    function initToolbarArrowNav(toolbarEl) {
        function getItems() {
            return Array.from(toolbarEl.querySelectorAll('button:not([disabled]), a[href]'))
                .filter((el) => {
                    const style = getComputedStyle(el);
                    return (style.display !== 'none') && (style.visibility !== 'hidden') && (el.tabIndex !== -1);
                });
        }
        toolbarEl.addEventListener('keydown', (e) => {
            const isLTR = (getComputedStyle(document.documentElement).direction !== 'rtl');
            const prevKey = isLTR ? 'ArrowLeft' : 'ArrowRight';
            const nextKey = isLTR ? 'ArrowRight' : 'ArrowLeft';
            const keys = [prevKey, nextKey, 'Home', 'End'];
            if (!keys.includes(e.key)) { return; }
            const items = getItems();
            if (items.length === 0) { return; }
            const currentIndex = Math.max(0, items.indexOf(document.activeElement));
            let nextIndex = currentIndex;
            if (e.key === nextKey) { nextIndex = (currentIndex + 1) % items.length; }
            if (e.key === prevKey) { nextIndex = (currentIndex - 1 + items.length) % items.length; }
            if (e.key === 'Home') { nextIndex = 0; }
            if (e.key === 'End') { nextIndex = items.length - 1; }
            if (nextIndex !== currentIndex) {
                e.preventDefault();
                items[nextIndex].focus();
            }
        });
    }

    function initPopstateSync() {
        window.addEventListener('popstate', () => {
            const key = getKeyByPath(location.pathname);
            if (key) {
                currentKey = key;
                showDialog(key);
            } else if (currentKey) {
                hideDialog(currentKey);
                currentKey = null;
            }
        });
    }

    function initDeepLink() {
        const key = getKeyByPath(location.pathname);
        if (key) { currentKey = key; showDialog(key); }
    }

    function init() {
        // Initialize known dialogs
        Object.keys(MODALS).forEach(initDialogEventsFor);
        initOpeners();
        initPopstateSync();
        initDeepLink();
        // Footer toolbar arrow navigation (contact links)
        const footerToolbar = document.querySelector('footer .contact[role="toolbar"]');
        if (footerToolbar) {
            initToolbarArrowNav(footerToolbar);
        }
    }

    init();
})();


