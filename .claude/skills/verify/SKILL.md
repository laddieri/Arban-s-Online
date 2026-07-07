---
name: verify
description: Build, run, and verify the Arban's Online viewer end-to-end with hermetic test images (no CDN or Supabase needed)
---

# Verifying Arban's Online

## Build + run for verification

The app needs page images to be functional. The e2e infrastructure generates
stand-in images and serves them locally — no external CDN or Supabase project
required (the app degrades to anonymous mode without Supabase env vars).

```bash
NEXT_PUBLIC_IMAGE_BASE_URL=http://localhost:8080 NEXT_PUBLIC_IMAGE_FORMAT=png npm run build
npm run test:e2e   # starts the image server and `npm start` itself
```

NEXT_PUBLIC_* vars are inlined at build time — changing them requires a rebuild.
Shell env vars override `.env.local`.

## Automated coverage (e2e/*.spec.ts)

Reading-position persistence and URL sync, history timezone grouping
(America/New_York context), pinch-to-zoom via CDP touch events, night mode,
metronome, print geometry (zero margins, Fill/Fit, PDF sheet counts via
`page.pdf` + MediaBox parsing), sidebar defaults, PWA manifest + offline.
Prefer extending these specs over ad-hoc scripts.

## Gotchas

- In sandboxed environments Playwright can't download browsers; point it at
  the preinstalled one: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/<rev>/chrome-linux/chrome`
  (check `ls /opt/pw-browsers`).
- `pkill -f "next-server"` matches your own shell's command line — use a
  self-excluding pattern like `pkill -f 'next[-]server'`.
- Manual print inspection: stub `window.print`/`window.close` via
  `context.addInitScript` and the print iframe (`iframe[aria-hidden="true"]`)
  stays inspectable; render its HTML with `page.setContent` + `page.pdf()`
  for ground-truth output.
- The service worker (public/sw.js) only registers in production builds.
  After changing it, bump its VERSION constant and hard-reload.
