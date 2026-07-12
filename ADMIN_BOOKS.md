# Adding Books Through the Site

Admins can add public-domain method books at **`/admin/books`** — no code
changes, no deploys, no terminal. Pick a PDF and the browser converts each
page to an image, uploads the pages straight to the R2 bucket, and registers
the book in the database. It appears in the book switcher immediately.

How it works, in one paragraph: the conversion runs entirely in the admin's
browser with pdf.js, so the server never processes PDF bytes. For each page,
the browser asks the (admin-only) API for a presigned R2 upload URL — valid
15 minutes, scoped to a single object key it cannot choose — and PUTs the
image directly to the bucket. When all pages are up, the book's metadata and
table of contents are saved to the Supabase `books` table, which the app
merges with the built-in books (Arban, Charlier) at runtime.

## One-time setup

### 1. Database

Run `lib/supabase/migrations/006_books_table.sql` in the Supabase SQL Editor.
(Fresh projects that ran `000_fresh_project_setup.sql` already have it.)

### 2. R2 API token

1. Cloudflare dashboard → **R2** → **Manage R2 API Tokens** → **Create API Token**
2. Permissions: **Object Read & Write**, scoped to your images bucket only
3. Copy the **Access Key ID** and **Secret Access Key**

Add four env vars to the deployment (Vercel → Settings → Environment
Variables) and redeploy:

| Variable | Value |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account id (dashboard URL or R2 overview page) |
| `R2_ACCESS_KEY_ID` | from the token |
| `R2_SECRET_ACCESS_KEY` | from the token |
| `R2_BUCKET_NAME` | the images bucket name |

These are server-only secrets — no `NEXT_PUBLIC_` prefix.

### 3. Bucket CORS

The browser PUTs directly to R2, which needs a CORS rule: R2 → your bucket →
**Settings** → **CORS policy**:

```json
[
  {
    "AllowedOrigins": ["https://your-domain.com", "http://localhost:3000"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

Replace `your-domain.com` with the real domain (keep localhost for dev).

## Using it

1. Sign in as an admin → `/admin` → **Manage Books** (or `/admin/books`)
2. Choose the PDF and fill in:
   - **Title** / **Short title** (the switcher label)
   - **URL id** — auto-suggested from the title; also the bucket folder
     (`<id>/page-000.webp`, …). Can't be changed later.
   - **Page offset** — `-1` when the first scan is "page 1" (most books:
     cover counts as page 1, like the Charlier). `N > 0` gives N
     Roman-numeral preface pages before printed page 1 (the Arban uses 7).
   - **First exercise page** — where the random-exercise button starts.
   - **Table of contents** — optional title/page rows; they power search.
     Click **✨ Suggest from pages** to fill them automatically: the scan
     reads each page's heading from the PDF's text layer when it has one
     (instant), or by OCR of the top of each page (about a second per page,
     with progress and a Cancel button). Suggestions include a snapshot of
     the scanned heading so you can verify and fix titles in place, and
     repeated running headers (the book title on every page) are filtered
     out automatically. The same button works later in **Edit** mode, where
     it reads the already-uploaded page images. Review before saving - OCR
     on old engravings is good but not perfect.
3. **Convert & upload**, and keep the tab open. ~1–2s per page; a progress
   bar tracks it. Each page retries a few times on flaky connections.
4. When it finishes, **Open it** — verify a few pages line up (cover on
   page 1, and a page number deep in the book matching its printed number).
   If they're off, **Edit** → adjust the page offset.

Books uploaded this way can be edited (metadata + TOC) or deleted from the
same screen. Deleting removes the book from the site but leaves its images
in the bucket — harmless, and re-adding the same id picks them right up
without re-uploading.

## Finding videos for exercises

Admins get a **Find videos for this page** button in the viewer toolbar (on
every book). It searches YouTube for the exercise on the open page - the
query is built from the book's table of contents ("Characteristic Study
No. 1 Arban's trumpet") and can be edited before re-searching - and each
result can be attached as an approved video with one click. Attached videos
appear in the page's video overlay and on /videos immediately.

One-time setup (YouTube Data API v3):

1. In [Google Cloud Console](https://console.cloud.google.com), create (or
   pick) a project → **APIs & Services** → **Library** → enable
   **YouTube Data API v3**
2. **APIs & Services** → **Credentials** → **Create credentials** →
   **API key**. Restrict the key to the YouTube Data API v3 (Application
   restrictions can stay "None" - the key is only used server-side).
3. Add it to the deployment env vars as `YOUTUBE_API_KEY` and redeploy.

The free quota is 10,000 units/day; each search costs 100 units, so about
100 searches a day - plenty for curating a book at a time. Expect named
pieces ("The Carnival of Venice") to search much better than numbered
exercises; edit the query when the defaults miss.

## Maintenance tools

- **Video health** (admin dashboard): checks every approved video against
  YouTube and lists the ones that no longer play - deleted, private, or
  embedding disabled - with one-click delete. Costs 1 quota unit per 50
  videos, so run it as often as you like (monthly is plenty).
- **Check a book's pages** (Manage Books page): sweeps a book's page images
  and reports missing or blank pages. Run it after each upload, or if a
  reader reports empty pages.
- **Pending badge**: when video submissions await review, the account
  button shows a red dot and the Admin Dashboard menu item shows the count.

## Troubleshooting

- **Pages render blank / white**: the PDF's scan images use a codec (JBIG2,
  JPEG 2000 - common on IMSLP) that pdf.js decodes with WebAssembly served
  from `/pdfjs/wasm/`. Those files are copied from `pdfjs-dist` into
  `public/pdfjs/` by `scripts/copy-pdfjs-assets.mjs` on every build - if
  they're missing, check that the build ran the `prebuild` script. The
  uploader also detects all-blank conversions and aborts instead of
  publishing a broken book.

## Notes

- Images upload as webp (~150–400KB/page at 2000px wide); on browsers that
  can't encode webp (older Safari) the whole book falls back to png
  automatically.
- Only admins (the `admins` table) can reach any of this; the upload URLs
  are minted server-side per page, so even an admin session can't write
  arbitrary bucket keys.
- The built-in books (`arban`, `charlier`) are compiled in and can't be
  overridden by an upload.
