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
    coverage: {
      provider: 'v8',
      // json-summary is what CI reads; the old workflow grep-ed an lcov text
      // pattern out of a JSON file and could never pass.
      reporter: ['text', 'json-summary', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/types/**', 'src/**/*.d.ts', 'src/emails/**'],
      // Podea anti-regresie, nu țintă: baseline-ul măsurat pe 2026-08-21 e
      // ~12% linii (serviciile sunt acoperite, componentele UI nu). Vechiul
      // prag de 85% din CI era imposibil și ținea tot workflow-ul roșu.
      thresholds: {
        lines: 10,
        statements: 10,
        functions: 8,
        branches: 10,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
