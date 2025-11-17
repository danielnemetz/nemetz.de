import { defineConfig } from 'vite';
import { imagetools } from 'vite-imagetools';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

function fixHtmlAfterBuild() {
  return {
    name: 'fix-html-after-build',
    closeBundle() {
      const htmlPath = join(process.cwd(), 'dist', 'index.html');
      let html = readFileSync(htmlPath, 'utf-8');
      
      // Extract script and stylesheet paths with hashes from Vite-generated HTML
      const scriptMatch = html.match(/<script[^>]*src="([^"]+)"[^>]*><\/script>/);
      const linkMatch = html.match(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
      
      const scriptPath = scriptMatch ? scriptMatch[1] : null;
      const stylesheetPath = linkMatch ? linkMatch[1] : null;
      
      // Remove all script and link tags that Vite added
      html = html.replace(/<script[^>]*><\/script>\s*/g, '');
      html = html.replace(/<link[^>]*rel="stylesheet"[^>]*>\s*/g, '');
      
      // Add stylesheet link after favicons with hash (if available)
      const stylesheetTag = stylesheetPath
        ? `<link rel="stylesheet" href="${stylesheetPath}">`
        : '<link rel="stylesheet" href="/styles.css">';
      
      html = html.replace(
        /(<link rel="icon" href="\/favicons\/favicon\.ico" sizes="any" \/>)\s*<\/head>/,
        `$1\n\n        <!-- Styles/Scripts -->\n        ${stylesheetTag}\n    </head>`
      );
      
      // Fix body opening tag (add newline after head)
      html = html.replace(/<\/head>\s*<body>/, '</head>\n    <body>');
      
      // Fix footer closing tag formatting
      html = html.replace(/<\/div>\s*<\/footer>/, '</div>\n        </footer>          ');
      
      // Add script tag before closing body tag with hash (if available)
      const scriptTag = scriptPath
        ? `<script src="${scriptPath}" defer></script>`
        : '<script src="/app.js" defer></script>';
      
      html = html.replace(
        /<\/footer>\s*<\/body>/,
        `</footer>          \n        ${scriptTag}\n    </body>`
      );
      
      // Remove trailing newlines
      html = html.trimEnd() + '\n';
      
      writeFileSync(htmlPath, html);
    },
  };
}

export default defineConfig({
  root: './src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'index.css') {
            return 'assets/[name]-[hash].css';
          }
          // Keep other assets in their original location
          return assetInfo.name || 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '',
      },
    },
  },
  plugins: [
    imagetools({
      defaultDirectives: (url: URL) => {
        if (url.searchParams.has('webp')) {
          return new URLSearchParams({
            format: 'webp',
            quality: '80',
          });
        }
        return new URLSearchParams();
      },
    }),
    fixHtmlAfterBuild(),
  ],
});

