import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyProxy from '@fastify/http-proxy';
import httpProxy from 'http-proxy';
import { Eta } from 'eta';
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { parseHTML } from 'linkedom';
import type { Lang, LocaleDict, ModalKey } from '../src/lib/types.js';
import { MODALS } from '../src/lib/types.js';
import {
  DEFAULT_LANG,
  SUPPORTED_LANGS,
  buildLocalizedPath,
  getBasePathForKey,
  getKeyByPath,
  splitLocalizedPath,
} from '../src/lib/routing.js';
import { getTranslationValue } from '../src/lib/i18n-utils.js';

const isDev = process.env.NODE_ENV !== 'production';
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';
const rootDir = process.cwd();
const templateFile = path.join(rootDir, isDev ? 'src/index.html' : 'dist/index.html');
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');
const localeDir = path.join(
  rootDir,
  isDev ? path.join('public', 'i18n') : path.join('dist', 'i18n'),
);
const viteDevServer = process.env.VITE_DEV_SERVER ?? 'http://localhost:5173';

// Single Eta instance – auto-escape HTML and cache templates in production
const eta = new Eta({ autoEscape: true, cache: !isDev });

type TemplateContext = {
  lang: Lang;
  initialDialog: ModalKey | null;
  translate: (key: string) => string;
  pathFor: (key: ModalKey | null) => string;
  langPathFor: (targetLang: Lang, key: ModalKey | null) => string;
  initialStateJson: string;
  MODALS: typeof MODALS;
};

const templateCache: { value: string | null } = { value: null };
const localeCache = new Map<Lang, LocaleDict>();

function isLang(value: string | null): value is Lang {
  return value === 'de' || value === 'en';
}

function isModalKey(value: string | null): value is ModalKey {
  return value === 'about' || value === 'imprint' || value === 'privacy';
}

async function loadTemplateString(): Promise<string> {
  // Base HTML comes from src/index.html in dev or dist/index.html in prod
  const html = await fs.readFile(templateFile, 'utf8');
  const { document } = parseHTML(html);
  const htmlElement = document.documentElement;
  htmlElement.setAttribute('lang', '<%= it.lang %>');

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) {
      return;
    }
    // Use innerHTML for HTML content (keys ending with 'Html'), textContent otherwise
    const isHtml = key.endsWith('Html');
    if (isHtml) {
      el.innerHTML = `<%~ it.translate(${JSON.stringify(key)}) %>`;
    } else {
      el.textContent = `<%~ it.translate(${JSON.stringify(key)}) %>`;
    }
  });

  document.querySelectorAll<HTMLElement>('.lang-toggle').forEach((link) => {
    const lang = link.getAttribute('data-lang');
    if (isLang(lang)) {
      link.setAttribute('href', `<%= it.langPathFor(${JSON.stringify(lang)}, it.initialDialog) %>`);
      link.setAttribute(
        'aria-current',
        `<%= ${JSON.stringify(lang)} === it.lang ? 'page' : 'false' %>`,
      );
    }
  });

  document.querySelectorAll<HTMLElement>('[data-open-dialog]').forEach((el) => {
    const key = el.getAttribute('data-open-dialog');
    if (isModalKey(key)) {
      el.setAttribute('href', `<%= it.pathFor(${JSON.stringify(key)}) %>`);
    }
  });

  Object.entries(MODALS).forEach(([key, def]) => {
    const node = document.getElementById(def.id);
    if (node) {
      node.setAttribute('data-open-placeholder', key);
    }
  });

  const entryScript = document.querySelector('script[type="module"][src="/app.ts"]');
  const stateScript = document.createElement('script');
  stateScript.type = 'module';
  stateScript.textContent = 'window.__INITIAL_STATE__ = <%~ it.initialStateJson %>;\n';
  if (entryScript?.parentNode) {
    entryScript.parentNode.insertBefore(stateScript, entryScript);
  } else {
    document.body.append(stateScript);
  }

  let template = document.toString();
  template = template.replace(
    / data-open-placeholder="(about|imprint|privacy)"/g,
    (_match, key: string) => {
      const def = MODALS[key as ModalKey];
      if (!def) {
        return '';
      }
      return `<% if (it.initialDialog === '${key}') { %> open<% } %>`;
    },
  );

  // Manual backdrop before closing body (needed for SSR open dialogs)
  template = template.replace(
    /<\/body>/,
    `<% if (it.initialDialog) { %><div class="dialog-backdrop" data-backdrop-for="<%= it.MODALS[it.initialDialog].id %>"></div><% } %>\n    </body>`,
  );
  template = template
    .replace(/&lt;%/g, '<%')
    .replace(/%&gt;/g, '%>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
  return template;
}

async function getTemplate(): Promise<string> {
  if (isDev) {
    return loadTemplateString();
  }
  if (!templateCache.value) {
    templateCache.value = await loadTemplateString();
  }
  return templateCache.value;
}

async function loadLocale(lang: Lang): Promise<LocaleDict> {
  if (!isDev && localeCache.has(lang)) {
    return localeCache.get(lang)!;
  }
  const filePath = path.join(localeDir, `${lang}.json`);
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw) as LocaleDict;
  if (!isDev) {
    localeCache.set(lang, parsed);
  }
  return parsed;
}

async function renderPage({
  lang,
  dialog,
  basePath,
}: {
  lang: Lang;
  dialog: ModalKey | null;
  basePath: string;
}): Promise<string> {
  const template = await getTemplate();
  const locale = await loadLocale(lang);
  const fallback = lang === DEFAULT_LANG ? locale : await loadLocale(DEFAULT_LANG);

  const translator = (key: string): string =>
    getTranslationValue(locale, key) ?? getTranslationValue(fallback, key) ?? '';

  const context: TemplateContext = {
    lang,
    initialDialog: dialog,
    translate: translator,
    pathFor: (key) => buildLocalizedPath(lang, getBasePathForKey(key)),
    langPathFor: (targetLang, key) => buildLocalizedPath(targetLang, getBasePathForKey(key)),
    initialStateJson: JSON.stringify({
      lang,
      dialog,
      path: buildLocalizedPath(lang, basePath),
    }),
    MODALS,
  };

  const rendered = eta.renderString(template, context);
  if (typeof rendered === 'string') {
    return rendered;
  }
  return await rendered;
}

async function render404Page(lang: Lang): Promise<string> {
  const template = await getTemplate();
  const locale = await loadLocale(lang);
  const fallback = lang === DEFAULT_LANG ? locale : await loadLocale(DEFAULT_LANG);

  const translator = (key: string): string =>
    getTranslationValue(locale, key) ?? getTranslationValue(fallback, key) ?? '';

  // Reuse base template and replace main area with minimal 404 content
  const { document } = parseHTML(await fs.readFile(templateFile, 'utf-8'));

  // Replace main content
  const main = document.querySelector('main');
  if (main) {
    main.innerHTML = `
            <h1 style="font-size: 1.5em;">404 | <span data-i18n="notFound.error"><%= it.translate("notFound.error") %></span></h1>
            <p><a href="<%= it.pathFor(null) %>" data-i18n="notFound.backHome"><%= it.translate("notFound.backHome") %></a></p>
        `;
  }

  // Update title
  const title = document.querySelector('title');
  if (title) {
    title.textContent = `${translator('notFound.title')} · nemetz.de`;
  }

  // Update meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', translator('notFound.message'));
  }

  // Set lang attribute
  const html = document.documentElement;
  html.setAttribute('lang', lang);

  // Update language toggles
  document.querySelectorAll<HTMLElement>('.lang-toggle').forEach((link) => {
    const linkLang = link.getAttribute('data-lang');
    if (isLang(linkLang)) {
      link.setAttribute('href', `<%= it.langPathFor(${JSON.stringify(linkLang)}, null) %>`);
      link.setAttribute(
        'aria-current',
        `<%= ${JSON.stringify(linkLang)} === it.lang ? 'page' : 'false' %>`,
      );
    }
  });

  // Note: data-i18n elements in main are already handled by Eta template

  const templateString = document
    .toString()
    .replace(/&lt;%/g, '<%')
    .replace(/%&gt;/g, '%>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");

  const context: TemplateContext = {
    lang,
    initialDialog: null,
    translate: translator,
    pathFor: (key) => buildLocalizedPath(lang, getBasePathForKey(key)),
    langPathFor: (targetLang, key) => buildLocalizedPath(targetLang, getBasePathForKey(key)),
    initialStateJson: JSON.stringify({
      lang,
      dialog: null,
      path: buildLocalizedPath(lang, '/'),
    }),
    MODALS,
  };

  const rendered = eta.renderString(templateString, context);
  if (typeof rendered === 'string') {
    return rendered;
  }
  return await rendered;
}

// Normalize incoming path to {lang, basePath} and detect redirects
function determineLang(
  pathname: string,
  searchParams: URLSearchParams,
): { lang: Lang; basePath: string; needsRedirect: boolean; search: string } {
  const { lang: pathLang, basePath } = splitLocalizedPath(pathname);
  const queryLang = searchParams.get('lang');
  const explicitLang = isLang(queryLang) ? queryLang : null;
  const finalLang = pathLang ?? explicitLang ?? DEFAULT_LANG;
  const sanitizedSearch = new URLSearchParams(searchParams);
  if (sanitizedSearch.has('lang')) {
    sanitizedSearch.delete('lang');
  }
  const sanitizedString = sanitizedSearch.toString();
  const canonicalPath = buildLocalizedPath(finalLang, basePath);
  const needsRedirect = pathname !== canonicalPath || sanitizedString !== searchParams.toString();
  return { lang: finalLang, basePath, needsRedirect, search: sanitizedString };
}

async function start(): Promise<void> {
  const fastify = Fastify({ logger: true }); // Main HTTP server
  const wsProxy = httpProxy.createProxyServer({
    target: viteDevServer.replace('http', 'ws'),
    ws: true,
    changeOrigin: true,
  });
  wsProxy.on('error', (err) => fastify.log.error({ err }, 'WS proxy error'));

  if (isDev) {
    // Proxy Vite-internal routes during dev (HMR, source files, etc.)
    const proxyPrefixes = ['/@vite', '/@fs', '/@id', '/@react-refresh', '/src', '/node_modules'];
    for (const prefix of proxyPrefixes) {
      fastify.register(fastifyProxy, {
        prefix,
        upstream: `${viteDevServer}${prefix}`,
        http2: false,
        websocket: prefix === '/@react-refresh',
        rewritePrefix: prefix,
      });
    }

    const passthrough = ['/assets', '/favicons', '/fonts', '/images', '/i18n', '/app.ts'];
    for (const prefix of passthrough) {
      fastify.register(fastifyProxy, {
        prefix,
        upstream: `${viteDevServer}${prefix}`,
        http2: false,
        rewritePrefix: prefix,
      });
    }

    // Allow localized asset URLs like /de/assets/... by stripping the prefix
    fastify.get('/:lang/*', async (request, reply) => {
      const params = request.params as { lang?: string };
      const lang = params.lang;
      if (!lang || !(SUPPORTED_LANGS as readonly string[]).includes(lang)) {
        return reply.callNotFound();
      }
      const originalUrl = new URL(request.raw.url ?? '/', 'http://localhost');
      const assetPath = originalUrl.pathname.replace(/^\/(de|en)/, '');
      if (!assetPath.includes('.')) {
        return reply.callNotFound();
      }
      const target = `${viteDevServer}${assetPath}${originalUrl.search}`;
      const res = await fetch(target);
      reply.status(res.status);
      res.headers.forEach((value, key) => reply.header(key, value));
      return reply.send(res.body);
    });

    fastify.server.on('upgrade', (req, socket, head) => {
      const pathname = req.url ?? '/';

      if (SUPPORTED_LANGS.some((lang) => pathname.startsWith(`/${lang}/@vite`))) {
        req.url = pathname.replace(/^\/(de|en)/, '');
        wsProxy.ws(req, socket, head);
        return;
      }

      if (pathname === '/' || pathname === '/@vite' || pathname.startsWith('/@react-refresh')) {
        wsProxy.ws(req, socket, head);
        return;
      }

      socket.destroy();
    });
  } else {
    const staticDirs: Array<{ prefix: string; dir: string }> = [
      { prefix: '/assets/', dir: 'assets' },
      { prefix: '/favicons/', dir: 'favicons' },
      { prefix: '/fonts/', dir: 'fonts' },
      { prefix: '/images/', dir: 'images' },
      { prefix: '/i18n/', dir: 'i18n' },
    ];

    for (const { prefix, dir } of staticDirs) {
      const fullPath = path.join(distDir, dir);
      if (!fsSync.existsSync(fullPath)) {
        continue;
      }
      fastify.register(fastifyStatic, {
        root: fullPath,
        prefix,
        decorateReply: false,
        cacheControl: true,
        maxAge: '1y',
      });
    }

    // Serve top-level files (robots, manifest, etc.) directly
    const singleFiles = ['robots.txt', 'favicon.ico', 'apple-touch-icon.png', 'site.webmanifest'];
    for (const fileName of singleFiles) {
      const fullPath = path.join(distDir, fileName);
      if (!fsSync.existsSync(fullPath)) {
        continue;
      }
      fastify.get(`/${fileName}`, async (_req, reply) => {
        const data = await fs.readFile(fullPath);
        const ext = path.extname(fileName).slice(1);
        const type =
          ext === 'txt'
            ? 'text/plain'
            : ext === 'ico'
              ? 'image/x-icon'
              : ext === 'png'
                ? 'image/png'
                : ext === 'webmanifest'
                  ? 'application/manifest+json'
                  : 'application/octet-stream';
        reply.type(type).send(data);
      });
    }
  }

  fastify.setNotFoundHandler(async (request, reply) => {
    const url = new URL(request.raw.url ?? '/', `http://localhost`);
    const { lang, basePath, needsRedirect, search } = determineLang(url.pathname, url.searchParams);

    if (needsRedirect) {
      const target = buildLocalizedPath(lang, basePath);
      reply.redirect(`${target}${search ? `?${search}` : ''}`, 302);
      return;
    }

    const dialog = basePath === '/' ? null : getKeyByPath(basePath);

    // If basePath is not root and no valid dialog was found, return 404
    if (basePath !== '/' && dialog === null) {
      reply.code(404);
      const html = await render404Page(lang);
      return reply
        .type('text/html; charset=utf-8')
        .header(
          'Cache-Control',
          isDev ? 'no-store' : 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
        )
        .send(html);
    }

    const html = await renderPage({ lang, dialog, basePath });

    reply
      .type('text/html; charset=utf-8')
      .header('Cache-Control', isDev ? 'no-store' : 'public, max-age=60, stale-while-revalidate=30')
      .send(html);
  });

  try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Server running on http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

void start();
