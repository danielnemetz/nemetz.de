import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyProxy from '@fastify/http-proxy';
import httpProxy from 'http-proxy';
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';

import type { Lang, ModalKey } from '../src/lib/types.js';
import {
  DEFAULT_LANG,
  SUPPORTED_LANGS,
  buildLocalizedPath,
  getKeyByPath,
  splitLocalizedPath,
} from '../src/lib/routing.js';
import { isDev, PORT, HOST, viteDevServer, distDir } from './config.js';
import { renderPage, render404Page } from './rendering.js';
import { generateSitemap } from './sitemap.js';

// Normalize incoming path to {lang, basePath} and detect redirects
function determineLang(
  pathname: string,
  searchParams: URLSearchParams,
): { lang: Lang; basePath: string; needsRedirect: boolean; search: string } {
  const { lang: pathLang, basePath } = splitLocalizedPath(pathname);
  const queryLang = searchParams.get('lang');
  const explicitLang = queryLang === 'de' || queryLang === 'en' ? queryLang : null;
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
      fastify.get(`/${fileName}`, async (req, reply) => {
        if (fileName === 'robots.txt' && req.headers.host === 'pre.nemetz.de') {
          return reply.type('text/plain').send('User-agent: *\nDisallow: /');
        }

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

  fastify.get('/sitemap.xml', async (_req, reply) => {
    const xml = generateSitemap();
    return reply.type('application/xml').header('Cache-Control', 'public, max-age=3600').send(xml);
  });

  fastify.get('/*', async (request, reply) => {
    const url = new URL(request.raw.url ?? '/', `http://localhost`);
    const { lang, basePath, needsRedirect, search } = determineLang(url.pathname, url.searchParams);

    if (needsRedirect) {
      const target = buildLocalizedPath(lang, basePath);
      reply.redirect(`${target}${search ? `?${search}` : ''}`, 302);
      return;
    }

    const dialog = basePath === '/' ? null : getKeyByPath(basePath);

    let html: string;
    if (basePath !== '/' && dialog === null) {
      reply.code(404);
      html = await render404Page(lang);
      reply.header(
        'Cache-Control',
        isDev ? 'no-store' : 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
      );
    } else {
      html = await renderPage({ lang, dialog, basePath });
      reply.header(
        'Cache-Control',
        isDev ? 'no-store' : 'public, max-age=60, stale-while-revalidate=30',
      );
    }

    reply.type('text/html; charset=utf-8');

    // Native compression removed (handled by Traefik)

    return reply.send(html);
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
