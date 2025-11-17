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
      
      // Remove all script and link tags that Vite added
      html = html.replace(/<script[^>]*><\/script>\s*/g, '');
      html = html.replace(/<link[^>]*rel="stylesheet"[^>]*>\s*/g, '');
      
      // Add stylesheet link after favicons and close head (matching html/index.html structure)
      html = html.replace(
        /(<link rel="icon" href="\/favicons\/favicon\.ico" sizes="any" \/>)\s*<\/head>/,
        '$1\n\n        <!-- Styles/Scripts -->\n        <link rel="stylesheet" href="/styles.css">\n    </head>'
      );
      
      // Fix body opening tag (add newline after head)
      html = html.replace(/<\/head>\s*<body>/, '</head>\n    <body>');
      
      // Fix footer closing tag formatting
      html = html.replace(/<\/div>\s*<\/footer>/, '</div>\n        </footer>          ');
      
      // Add script tag before closing body tag (matching html/index.html structure)
      html = html.replace(
        /<\/footer>\s*<\/body>/,
        '</footer>          \n        <script src="/app.js" defer></script>\n    </body>'
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
        entryFileNames: 'app.js',
        chunkFileNames: 'app.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'index.css') {
            return 'styles.css';
          }
          return assetInfo.name || 'asset';
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

