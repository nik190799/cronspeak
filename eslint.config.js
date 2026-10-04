import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['dist/', 'coverage/', 'tests/fixtures/retro/']),
  js.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    rules: {
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // The CLI is the only layer allowed to talk to the console.
    files: ['src/cli/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
);
