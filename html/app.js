(() => {
    const OPEN_ATTR = 'data-open-dialog';
    const MODALS = {
        about:   { id: 'about-dialog',   path: '/about'   },
        imprint: { id: 'imprint-dialog', path: '/imprint' },
    };
    let currentKey = null;
    let lastFocused = null;
    let currentLang = 'en';

    // i18n: load JSON locales on demand (cached in-memory)
    const localeCache = {};
    async function loadLocale(lang) {
        if (localeCache[lang]) { return localeCache[lang]; }
        try {
            const res = await fetch(`/i18n/${lang}.json`, { cache: 'no-cache' });
            if (!res.ok) { throw new Error(`i18n load failed: ${res.status}`); }
            const data = await res.json();
            localeCache[lang] = data;
            return data;
        } catch (e) {
            console.error(e);
            if (lang !== 'en') { return loadLocale('en'); }
            return {};
        }
    }

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
        renderModal(key);
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
        // language controls in header
        const toggles = dlg.querySelectorAll('.lang-toggle');
        toggles.forEach((btn) => {
            btn.addEventListener('click', () => {
                const lang = btn.getAttribute('data-lang');
                setLanguage(lang, { syncUrl: true });
                renderModal(key);
                toggles.forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === currentLang)));
            });
        });
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
                const lang = getLangFromUrl();
                if (lang) { setLanguage(lang, { syncUrl: false }); }
                renderModal(key);
            } else if (currentKey) {
                hideDialog(currentKey);
                currentKey = null;
            }
        });
    }

    function initDeepLink() {
        const key = getKeyByPath(location.pathname);
        const urlLang = getLangFromUrl();
        if (urlLang) { setLanguage(urlLang, { syncUrl: false }); }
        else {
            const stored = localStorage.getItem('lang');
            if (stored === 'de' || stored === 'en') { currentLang = stored; }
            else {
                const browser = getBrowserDefaultLang();
                setLanguage(browser, { syncUrl: false });
            }
        }
        if (key) { currentKey = key; showDialog(key); renderModal(key); }
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

    function getLangFromUrl() {
        const params = new URLSearchParams(location.search);
        const lang = params.get('lang');
        if (lang === 'de' || lang === 'en') { return lang; }
        return null;
    }

    function getBrowserDefaultLang() {
        const candidates = Array.isArray(navigator.languages) && (navigator.languages.length > 0)
            ? navigator.languages
            : [navigator.language, navigator.userLanguage, navigator.browserLanguage].filter(Boolean);
        for (const cand of candidates) {
            const lc = String(cand || '').toLowerCase();
            if (lc.startsWith('de')) { return 'de'; }
        }
        return 'en';
    }

    function setLanguage(lang, { syncUrl = false } = {}) {
        if (lang !== 'de' && lang !== 'en') { return; }
        currentLang = lang;
        localStorage.setItem('lang', currentLang);
        if (syncUrl && currentKey) {
            const def = MODALS[currentKey];
            const url = new URL(location.href);
            url.pathname = def.path;
            url.searchParams.set('lang', currentLang);
            history.replaceState({ modal: currentKey }, '', url.toString());
        }
    }

    async function renderModal(key) {
        const dict = await loadLocale(currentLang);
        const dlg = getDialog(key);
        if (!dict || !dlg) { return; }
        dlg.setAttribute('lang', currentLang);
        dlg.querySelectorAll('[data-i18n]').forEach((el) => {
            const path = el.getAttribute('data-i18n');
            const parts = path.split('.');
            let node = dict;
            for (const p of parts) {
                if (node && typeof node === 'object') { node = node[p]; }
            }
            if (typeof node === 'string') {
                if (node.includes('<')) { el.innerHTML = node; }
                else { el.textContent = node; }
            }
        });
        dlg.querySelectorAll('.lang-toggle').forEach((b) => {
            b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === currentLang));
        });
    }

    init();
})();


