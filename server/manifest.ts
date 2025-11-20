import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { distDir, isDev } from './config.js';

type Manifest = Record<string, { file: string; css?: string[]; isEntry?: boolean; src?: string }>;
let manifest: Manifest | null = null;

export async function loadManifest(): Promise<Manifest> {
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

export function getAssets(): { script: string; css: string | null } {
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

export function getManifest(): Manifest | null {
  return manifest;
}
