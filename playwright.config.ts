import { defineConfig } from '@playwright/test';

// End-to-end tests run against a production build (`npm run build` first)
// with locally generated stand-in page images, so no external CDN or
// Supabase project is needed. See e2e/README.md.
//
// PLAYWRIGHT_CHROMIUM_EXECUTABLE can point at a preinstalled Chromium when
// downloading browsers isn't possible (e.g. sandboxed environments).

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  globalSetup: './e2e/global-setup',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3000',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
      // Fake camera/mic (green test pattern + tone) so the performance
      // recorder can be exercised without hardware or permission prompts
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
      ],
    },
  },
  webServer: [
    {
      command: 'node e2e/image-server.mjs',
      url: 'http://localhost:8080/health',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run start',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});
