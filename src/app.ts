import './styles.scss';

type ModalKey = 'about' | 'imprint';
type Lang = 'de' | 'en';
type LocaleDict = Record<string, unknown>;

interface ModalDef {
    id: string;
    path: string;
}

const OPEN_ATTR = 'data-open-dialog';
const MODALS: Record<ModalKey, ModalDef> = {
    about: { id: 'about-dialog', path: '/about' },
    imprint: { id: 'imprint-dialog', path: '/imprint' },
};

let currentKey: ModalKey | null = null;
let lastFocused: HTMLElement | null = null;
let currentLang: Lang = 'en';

const localeCache: Record<Lang, LocaleDict> = {} as Record<Lang, LocaleDict>;

async function loadLocale(lang: Lang): Promise<LocaleDict> {
    if (localeCache[lang]) {
        return localeCache[lang];
    }
    try {
        const res = await fetch(`/i18n/${lang}.json`, { cache: 'no-cache' });
        if (!res.ok) {
            throw new Error(`i18n load failed: ${res.status}`);
        }
        const data = (await res.json()) as LocaleDict;
        localeCache[lang] = data;
        return data;
    } catch (e) {
        console.error(e);
        if (lang !== 'en') {
            return loadLocale('en');
        }
        return {};
    }
}

function getDialog(key: ModalKey): HTMLDialogElement | null {
    const def = MODALS[key];
    if (!def) {
        return null;
    }
    return document.getElementById(def.id) as HTMLDialogElement | null;
}

function getKeyByPath(pathname: string): ModalKey | null {
    const entry = Object.entries(MODALS).find(([, def]) => pathname === def.path);
    return (entry ? entry[0] : null) as ModalKey | null;
}

function pushPathFor(key: ModalKey): void {
    const def = MODALS[key];
    if (!def) {
        return;
    }
    if (location.pathname !== def.path) {
        history.pushState({ modal: key }, '', def.path);
    }
}

function replaceToRootIfPathMatches(key: ModalKey): void {
    const def = MODALS[key];
    if (!def) {
        return;
    }
    if (location.pathname === def.path) {
        history.replaceState({}, '', '/');
    }
}

function showDialog(key: ModalKey): void {
    const dlg = getDialog(key);
    if (dlg && !dlg.open) {
        dlg.showModal();
    }
}

function hideDialog(key: ModalKey): void {
    const dlg = getDialog(key);
    if (dlg && dlg.open) {
        dlg.close();
    }
}

interface OpenDialogOptions {
    updateUrl?: boolean;
    key?: ModalKey;
}

function openDialog(event: Event | null, options: OpenDialogOptions = {}): void {
    const { updateUrl = true, key } = options;
    if (event && event.preventDefault) {
        event.preventDefault();
    }
    let dialogKey: ModalKey | null = key ?? null;
    if (!dialogKey && event && event.currentTarget instanceof HTMLElement) {
        const attr = event.currentTarget.getAttribute(OPEN_ATTR);
        dialogKey = (attr === 'about' || attr === 'imprint' ? attr : null) as ModalKey | null;
    }
    if (!dialogKey || !MODALS[dialogKey]) {
        return;
    }
    lastFocused = document.activeElement as HTMLElement | null;
    currentKey = dialogKey;
    showDialog(dialogKey);
    renderModal(dialogKey);
    if (updateUrl === true) {
        pushPathFor(dialogKey);
    }
}

interface CloseDialogOptions {
    updateUrl?: boolean;
}

function closeDialog(options: CloseDialogOptions = {}): void {
    const { updateUrl = true } = options;
    if (!currentKey) {
        return;
    }
    hideDialog(currentKey);
    if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
    }
    if (updateUrl === true) {
        replaceToRootIfPathMatches(currentKey);
    }
    currentKey = null;
}

function handleBackdropClick(key: ModalKey, e: MouseEvent): void {
    const dlg = getDialog(key);
    if (!dlg || e.target === dlg) {
        closeDialog({ updateUrl: true });
    }
}

function initOpeners(): void {
    document.querySelectorAll(`[${OPEN_ATTR}]`).forEach((el) => {
        el.addEventListener('click', (e) => openDialog(e));
    });
}

function updateLangToggles(dlg: HTMLDialogElement): void {
    dlg.querySelectorAll('.lang-toggle').forEach((b) => {
        const lang = b.getAttribute('data-lang');
        b.setAttribute('aria-pressed', String(lang === currentLang));
    });
}

function initDialogEventsFor(key: ModalKey): void {
    const dlg = getDialog(key);
    if (!dlg) {
        return;
    }
    dlg.addEventListener('cancel', (e) => {
        e.preventDefault();
        closeDialog({ updateUrl: true });
    });
    dlg.addEventListener('click', (e) => handleBackdropClick(key, e));
    dlg.querySelectorAll('button[value="close"]').forEach((btn) => {
        btn.addEventListener('click', () => closeDialog({ updateUrl: true }));
    });
    const toolbar = dlg.querySelector('.dialog-actions');
    if (toolbar instanceof HTMLElement) {
        initToolbarArrowNav(toolbar);
    }
    dlg.querySelectorAll('.lang-toggle').forEach((btn) => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            if (lang === 'de' || lang === 'en') {
                setLanguage(lang, { syncUrl: true });
                renderModal(key);
            }
        });
    });
}

function initToolbarArrowNav(toolbarEl: HTMLElement): void {
    function getItems(): HTMLElement[] {
        return Array.from(toolbarEl.querySelectorAll('button:not([disabled]), a[href]'))
            .filter((el): el is HTMLElement => {
                if (!(el instanceof HTMLElement)) {
                    return false;
                }
                const style = getComputedStyle(el);
                return (
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    el.tabIndex !== -1
                );
            });
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

function initPopstateSync(): void {
    window.addEventListener('popstate', () => {
        const key = getKeyByPath(location.pathname);
        if (key) {
            currentKey = key;
            showDialog(key);
            const lang = getLangFromUrl();
            if (lang) {
                setLanguage(lang, { syncUrl: false });
            }
            renderModal(key);
        } else if (currentKey) {
            hideDialog(currentKey);
            currentKey = null;
        }
    });
}

function initDeepLink(): void {
    const key = getKeyByPath(location.pathname);
    const urlLang = getLangFromUrl();
    if (urlLang) {
        setLanguage(urlLang, { syncUrl: false });
    } else {
        const stored = localStorage.getItem('lang');
        if (stored === 'de' || stored === 'en') {
            currentLang = stored;
        } else {
            setLanguage(getBrowserDefaultLang(), { syncUrl: false });
        }
    }
    if (key) {
        currentKey = key;
        showDialog(key);
        renderModal(key);
    }
}

function init(): void {
    (Object.keys(MODALS) as ModalKey[]).forEach(initDialogEventsFor);
    initOpeners();
    initPopstateSync();
    initDeepLink();
    const footerToolbar = document.querySelector('footer .contact[role="toolbar"]');
    if (footerToolbar instanceof HTMLElement) {
        initToolbarArrowNav(footerToolbar);
    }
}

function getLangFromUrl(): Lang | null {
    const params = new URLSearchParams(location.search);
    const lang = params.get('lang');
    if (lang === 'de' || lang === 'en') {
        return lang;
    }
    return null;
}

function getBrowserDefaultLang(): Lang {
    const nav = navigator as Navigator & {
        userLanguage?: string;
        browserLanguage?: string;
    };
    const candidates =
        navigator.languages?.length > 0
            ? navigator.languages
            : [navigator.language, nav.userLanguage, nav.browserLanguage].filter(Boolean);
    return candidates.some((lang) => String(lang ?? '').toLowerCase().startsWith('de'))
        ? 'de'
        : 'en';
}

interface SetLanguageOptions {
    syncUrl?: boolean;
}

function setLanguage(lang: Lang, options: SetLanguageOptions = {}): void {
    const { syncUrl = false } = options;
    if (lang !== 'de' && lang !== 'en') {
        return;
    }
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

async function renderModal(key: ModalKey): Promise<void> {
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

init();

