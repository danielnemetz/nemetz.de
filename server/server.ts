import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCompress from '@fastify/compress';
import fastifyProxy from '@fastify/http-proxy';
import httpProxy from 'http-proxy';
import { Eta } from 'eta';
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
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
const templateFile = path.join(rootDir, isDev ? 'src/index.eta' : 'dist/index.eta');
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');
const localeDir = path.join(
  rootDir,
  isDev ? path.join('public', 'i18n') : path.join('dist', 'i18n'),
);
const viteDevServer = process.env.VITE_DEV_SERVER ?? 'http://localhost:5173';

// Single Eta instance – auto-escape HTML and cache templates in production
const eta = new Eta({ autoEscape: true, cache: !isDev });
// Build ID - read at runtime to pick up container environment
function getBuildId(): string {
  return process.env.BUILD_ID ?? 'local-dev';
}

type TemplateContext = {
  lang: Lang;
  initialDialog: ModalKey | null;
  t: (key: string) => string;
  pathFor: (key: ModalKey | null) => string;
  langPathFor: (targetLang: Lang, key: ModalKey | null) => string;
  initialStateJson: string;
  MODALS: typeof MODALS;
  buildId: string;
  assets: {
    script: string;
    css: string | null;
  };
  isDev: boolean;
};

// Manifest handling
type Manifest = Record<string, { file: string; css?: string[]; isEntry?: boolean; src?: string }>;
let manifest: Manifest | null = null;

async function loadManifest(): Promise<Manifest> {
  if (isDev) return {};
  if (manifest) return manifest;

  try {
    // Vite 5+ puts manifest in .vite/manifest.json by default, but we can check both
    const possiblePaths = [
      path.join(distDir, '.vite', 'manifest.json'),
      path.join(distDir, 'manifest.json'),
    ];

    for (const p of possiblePaths) {
      if (fsSync.existsSync(p)) {
        const content = await fs.readFile(p, 'utf-8');
        manifest = JSON.parse(content) as Manifest;
        return manifest!;
      }
    }
    console.warn('Manifest not found in dist!');
    return {};
  } catch (e) {
    console.error('Failed to load manifest', e);
    return {};
  }
}

function getAssets(): { script: string; css: string | null } {
  if (isDev) {
    return { script: '/app.ts', css: null }; // Vite handles CSS in dev
  }

  if (!manifest) return { script: '', css: null };

  // Find entry point (usually index.html or app.ts depending on how Vite was triggered)
  // In our case, we likely have an entry for 'src/index.html' or 'index.html'
  const entry = Object.values(manifest).find((chunk) => chunk.isEntry);

  if (!entry) {
    return { script: '', css: null };
  }

  return {
    script: `/${entry.file}`,
    css: entry.css && entry.css.length > 0 ? `/${entry.css[0]}` : null,
  };
}

const templateCache: { value: string | null } = { value: null };
const localeCache = new Map<Lang, LocaleDict>();

function isLang(value: string | null): value is Lang {
  return value === 'de' || value === 'en';
}

async function loadTemplateString(): Promise<string> {
  return await fs.readFile(templateFile, 'utf8');
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

  // Ensure manifest is loaded in prod
  if (!isDev && !manifest) {
    await loadManifest();
  }

  const translator = (key: string): string =>
    getTranslationValue(locale, key) ?? getTranslationValue(fallback, key) ?? '';

  const context: TemplateContext = {
    lang,
    initialDialog: dialog,
    t: translator,
    pathFor: (key) => buildLocalizedPath(lang, getBasePathForKey(key)),
    langPathFor: (targetLang, key) => buildLocalizedPath(targetLang, getBasePathForKey(key)),
    initialStateJson: JSON.stringify({
      lang,
      dialog,
      path: buildLocalizedPath(lang, basePath),
    }),
    MODALS,
    buildId: getBuildId(),
    assets: getAssets(),
    isDev,
  };

  const rendered = eta.renderString(template, context);
  return rendered;
}

async function render404Page(lang: Lang): Promise<string> {
  const template = await getTemplate();
  const locale = await loadLocale(lang);
  const fallback = lang === DEFAULT_LANG ? locale : await loadLocale(DEFAULT_LANG);

  if (!isDev && !manifest) {
    await loadManifest();
  }

  const translator = (key: string): string =>
    getTranslationValue(locale, key) ?? getTranslationValue(fallback, key) ?? '';

  const context: TemplateContext & { is404: boolean } = {
    lang,
    initialDialog: null,
    t: translator,
    pathFor: (key) => buildLocalizedPath(lang, getBasePathForKey(key)),
    langPathFor: (targetLang, key) => buildLocalizedPath(targetLang, getBasePathForKey(key)),
    initialStateJson: JSON.stringify({
      lang,
      dialog: null,
      path: buildLocalizedPath(lang, '/'),
    }),
    MODALS,
    buildId: getBuildId(),
    assets: getAssets(),
    isDev,
    is404: true,
  };

  return eta.renderString(template, context);
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
      res.headers.forEach((value: string, headerKey: string) => reply.header(headerKey, value));
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
        preCompressed: true, // Serve .gz and .br files if available
      });
    }

    // Serve top-level files (robots, manifest, etc.) directly
    const singleFiles = [
      'robots.txt',
      'favicon.ico',
      'apple-touch-icon.png',
      'site.webmanifest',
      '404-logo.svg',
    ];
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
                  : ext === 'svg'
                    ? 'image/svg+xml'
                    : 'application/octet-stream';
        reply.type(type).send(data);
      });
    }
  }

  fastify.get('/*', async (request, reply) => {
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
