import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests only; e2e/*.spec.ts belongs to Playwright (npm run test:e2e)
    include: ['utils/**/*.test.ts'],
  },
});
