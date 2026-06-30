import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.turbo/**',
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts', '**/*.tsx'],

    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
      },
    },
  },
);
