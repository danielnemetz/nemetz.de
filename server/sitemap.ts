import { MODALS } from '../src/lib/types.js';
import { SUPPORTED_LANGS, buildLocalizedPath } from '../src/lib/routing.js';

const BASE_URL = 'https://nemetz.de';

export function generateSitemap(): string {
    const paths = ['/', ...Object.values(MODALS).map((m) => m.path)];
    const urls: string[] = [];

    for (const path of paths) {
        for (const lang of SUPPORTED_LANGS) {
            const loc = `${BASE_URL}${buildLocalizedPath(lang, path)}`;

            // Generate hreflang links for all supported languages for this path
            const alternates = SUPPORTED_LANGS.map((l) => {
                const href = `${BASE_URL}${buildLocalizedPath(l, path)}`;
                return `    <xhtml:link rel="alternate" hreflang="${l}" href="${href}" />`;
            }).join('\n');

            urls.push(`
  <url>
    <loc>${loc}</loc>
${alternates}
    <changefreq>monthly</changefreq>
    <priority>${path === '/' ? '1.0' : '0.8'}</priority>
  </url>`);
        }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('')}
</urlset>`;
}
