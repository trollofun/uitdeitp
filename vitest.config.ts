import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Vitest was in package.json since the beginning but never had a config, so the
 * `@/` alias never resolved and every one of the test files failed at import.
 * PRD §6 asks for this to be wired before F2.
 *
 * tests/e2e is Playwright's, not Vitest's — excluded, or `npm run test` tries
 * to run browser specs in jsdom.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', 'tests/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
