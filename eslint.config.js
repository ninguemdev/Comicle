import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Dependency rules from docs/arquitetura.md §3, enforced per directory.

/** Rule 1: @comicle/shared imports nothing from apps/* and no runtime library other than Zod. */
const sharedImports = {
  patterns: [
    {
      group: [
        '@comicle/web',
        '@comicle/web/*',
        '@comicle/server',
        '@comicle/server/*',
        '**/apps/**',
      ],
      message: '@comicle/shared não pode importar código de apps/* (arquitetura §3.1).',
    },
    {
      regex: '^(?!zod(?:/|$)|vitest(?:/|$)|\\.{1,2}/)',
      message: '@comicle/shared só pode depender de Zod em runtime (arquitetura §3.1).',
    },
  ],
};

/** Rule 2: pure domain code (no .service/.handlers/.routes/.repository suffix) has no infrastructure. */
const pureDomainImports = {
  patterns: [
    {
      group: ['fastify', 'fastify/*', '@fastify/*'],
      message: 'Domínio puro não importa Fastify (arquitetura §3.2).',
    },
    {
      group: ['socket.io', 'socket.io/*', 'socket.io-client'],
      message: 'Domínio puro não importa Socket.IO (arquitetura §3.2).',
    },
    {
      group: ['drizzle-orm', 'drizzle-orm/*', 'pg'],
      message: 'Domínio puro não acessa o banco (arquitetura §3.2).',
    },
  ],
};

const pureDomainProperties = [
  {
    object: 'Date',
    property: 'now',
    message: 'Use o Clock injetado (arquitetura §3.2).',
  },
  {
    object: 'Math',
    property: 'random',
    message: 'Use o Rng injetado (arquitetura §3.2).',
  },
];

/** Rule 6: web components talk to the socket only through store actions. */
const componentImports = {
  patterns: [
    {
      group: ['**/lib/socket-client', '**/lib/socket-client.ts'],
      message: 'Componentes usam ações das stores, não o socket (arquitetura §3.6).',
    },
  ],
};

/** Interface text lives in apps/web/src/strings/pt-BR.ts, never as a literal in JSX (interface.md). */
const literalTextMessage = 'Texto de interface vem de strings/pt-BR.ts (interface.md).';
const noLiteralText = [
  { selector: 'JSXText[value=/\\S/]', message: literalTextMessage },
  {
    // An empty alt marks a decorative image; it is not interface text.
    selector:
      'JSXAttribute[name.name=/^(aria-label|title|alt|placeholder)$/] > Literal[value=/\\S/]',
    message: literalTextMessage,
  },
];

export default defineConfig(
  globalIgnores(['**/dist/', '**/coverage/', 'apps/server/drizzle/']),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['packages/shared/src/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', sharedImports] },
  },
  {
    files: ['apps/server/src/modules/**/*.ts'],
    ignores: ['**/*.service.ts', '**/*.handlers.ts', '**/*.routes.ts', '**/*.repository.ts'],
    rules: {
      'no-restricted-imports': ['error', pureDomainImports],
      'no-restricted-properties': ['error', ...pureDomainProperties],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['apps/web/src/lib/**', 'apps/web/src/stores/**'],
    rules: { 'no-restricted-imports': ['error', componentImports] },
  },
  {
    files: ['apps/web/src/**/*.tsx'],
    ignores: ['**/*.test.tsx'],
    rules: { 'no-restricted-syntax': ['error', ...noLiteralText] },
  },
  prettier,
);
