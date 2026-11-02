/**
 * Next's preset plus the architecture rules from CLAUDE.md. Every rule is an error, so clean lint
 * prints nothing and there are no warnings to scroll past.
 *
 * An intended exception goes at the line: `// eslint-disable-next-line <rule> -- <why>`.
 */
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// CLAUDE.md "The UI never touches the database". The UI reads through lib/queries and writes through
// server actions. Type imports are fine; a value import pulls the Prisma client into the page, or
// into the browser bundle from a 'use client' file.
const DB_MODULES = ['@/lib/db'];
const DB_MESSAGE = 'UI files may import types from the database, not values. Read via lib/queries, write via a server action.';

/** Every 'warn' becomes 'error'. */
function warningsAsErrors(configs) {
  const toError = (entry) => {
    const level = Array.isArray(entry) ? entry[0] : entry;
    if (level !== 'warn' && level !== 1) return entry;
    return Array.isArray(entry) ? ['error', ...entry.slice(1)] : 'error';
  };
  return configs.map((c) =>
    c.rules
      ? { ...c, rules: Object.fromEntries(Object.entries(c.rules).map(([id, entry]) => [id, toError(entry)])) }
      : c,
  );
}

export default defineConfig([
  ...warningsAsErrors([
    ...nextVitals,
    ...nextTs,
    {
      linterOptions: {
        // A disable comment that no longer disables anything; `eslint --fix` removes it.
        reportUnusedDisableDirectives: 'error',
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        // Catches the next god component early. Comments don't count, so documenting code is free.
        'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      },
    },
    {
      // UI-layer files. Route handlers aren't UI.
      files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}'],
      ignores: ['app/api/**'],
      rules: {
        '@typescript-eslint/no-restricted-imports': [
          'error',
          {
            paths: DB_MODULES.map((name) => ({ name, message: DB_MESSAGE, allowTypeImports: true })),
            patterns: [{ group: ['@prisma/client', '@prisma/client/*'], message: DB_MESSAGE, allowTypeImports: true }],
          },
        ],
      },
    },
  ]),
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'coverage/**', '.playbook/**']),
]);
