import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// eslint-config-next 15.5 fournit du format legacy : pont FlatCompat.
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      '.next/**',
      '.next-e2e/**',
      'test-results/**',
      'playwright-report/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'node_modules/**',
      '.claude/**',
      '.cline/skills/**',
      'scripts/**',
    ],
  },
];

export default eslintConfig;
