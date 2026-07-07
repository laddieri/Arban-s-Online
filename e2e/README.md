# End-to-end tests

Playwright tests covering the viewer's real behavior in a browser: reading
position persistence, history timezone grouping, pinch-to-zoom (via CDP touch
events), night mode, the metronome, print output geometry (measured down to
the generated PDF), and offline/PWA behavior.

The suite is hermetic — no external CDN or Supabase project required:

- `global-setup.ts` generates stand-in page images (`e2e/.test-images/`,
  gitignored) with a book-page aspect ratio.
- `image-server.mjs` serves them on `http://localhost:8080` (started
  automatically by the Playwright `webServer` config, as is `npm run start`).

## Running locally

The app must be **built** with the test image source first (shell env vars
override `.env.local`):

```bash
NEXT_PUBLIC_IMAGE_BASE_URL=http://localhost:8080 NEXT_PUBLIC_IMAGE_FORMAT=png npm run build
npm run test:e2e
```

If Playwright can't download browsers in your environment, point it at an
existing Chromium:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome npm run test:e2e
```
