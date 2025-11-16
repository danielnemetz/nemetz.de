(() => {
    const ABOUT_PATH = '/about';
    const OPEN_ATTR = 'data-open-dialog';
    const DIALOG_ID = 'about-dialog';

    let dialog = null;
    let lastFocused = null;

    function getDialog() {
        if ((dialog === null)) {
            dialog = document.getElementById(DIALOG_ID);
        }
        return dialog;
    }

    function isAboutPath() {
        return (location.pathname === ABOUT_PATH);
    }

    function pushAboutUrl() {
        if (isAboutPath()) { return; }
        history.pushState({ modal: 'about' }, '', ABOUT_PATH);
    }

    function replaceToRoot() {
        if (!isAboutPath()) { return; }
        history.replaceState({}, '', '/');
    }

    function showDialog() {
        const dlg = getDialog();
        if (!dlg) { return; }
        if (!dlg.open) { dlg.showModal(); }
    }

    function hideDialog() {
        const dlg = getDialog();
        if (!dlg) { return; }
        if (dlg.open) { dlg.close(); }
    }

    function openDialog(event, { updateUrl = true } = {}) {
        if (event && event.preventDefault) { event.preventDefault(); }
        lastFocused = document.activeElement;
        showDialog();
        if ((updateUrl === true)) { pushAboutUrl(); }
    }

    function closeDialog({ updateUrl = true } = {}) {
        hideDialog();
        if (lastFocused && (typeof lastFocused.focus === 'function')) {
            lastFocused.focus();
        }
        if ((updateUrl === true)) { replaceToRoot(); }
    }

    function handleBackdropClick(e) {
        const dlg = getDialog();
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
        document.querySelectorAll(`[${OPEN_ATTR}="about"]`).forEach((el) => {
            el.addEventListener('click', (e) => openDialog(e));
        });
    }

    function initDialogEvents() {
        const dlg = getDialog();
        if (!dlg) { return; }
        dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeDialog({ updateUrl: true }); });
        dlg.addEventListener('click', handleBackdropClick);
        dlg.querySelectorAll('button[value="close"]').forEach((btn) => {
            btn.addEventListener('click', () => closeDialog({ updateUrl: true }));
        });
        // Arrow navigation in actions toolbar
        const toolbar = dlg.querySelector('.dialog-actions');
        if (toolbar) {
            initToolbarArrowNav(toolbar);
        }
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
            if (isAboutPath()) {
                showDialog();
            } else {
                hideDialog();
            }
        });
    }

    function initDeepLink() {
        if (isAboutPath()) {
            showDialog();
        }
    }

    function init() {
        if (!getDialog()) { return; }
        initOpeners();
        initDialogEvents();
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


