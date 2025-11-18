import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';

const tsConfigs = tseslint.configs.recommendedTypeChecked.map((config) => ({
  ...config,
  files: ['src/**/*.ts'],
  languageOptions: {
    ...config.languageOptions,
    parser: tseslint.parser,
    parserOptions: {
      ...config.languageOptions?.parserOptions,
      project: ['./tsconfig.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
}));

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/favicons/**', '.pnpm-store/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  js.configs.recommended,
  ...tsConfigs,
  {
    files: ['src/**/*.ts'],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
];
