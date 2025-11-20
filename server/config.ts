import path from 'node:path';

export const isDev = process.env.NODE_ENV !== 'production';
export const PORT = Number(process.env.PORT ?? 3000);
export const HOST = process.env.HOST ?? '0.0.0.0';
export const viteDevServer = process.env.VITE_DEV_SERVER ?? 'http://localhost:5173';

export const rootDir = process.cwd();
export const templateFile = path.join(rootDir, isDev ? 'src/index.eta' : 'dist/index.eta');
export const publicDir = path.join(rootDir, 'public');
export const distDir = path.join(rootDir, 'dist');
export const localeDir = path.join(
  rootDir,
  isDev ? path.join('public', 'i18n') : path.join('dist', 'i18n'),
);

export function getBuildId(): string {
  return process.env.BUILD_ID ?? 'local-dev';
}
