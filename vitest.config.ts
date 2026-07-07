import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  test: {
    // Unit tests only; e2e/*.spec.ts belongs to Playwright (npm run test:e2e)
    include: ['utils/**/*.test.ts'],
  },
});
