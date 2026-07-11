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
     Fine to leave empty and fill in later via **Edit**.
3. **Convert & upload**, and keep the tab open. ~1–2s per page; a progress
   bar tracks it. Each page retries a few times on flaky connections.
4. When it finishes, **Open it** — verify a few pages line up (cover on
   page 1, and a page number deep in the book matching its printed number).
   If they're off, **Edit** → adjust the page offset.

Books uploaded this way can be edited (metadata + TOC) or deleted from the
same screen. Deleting removes the book from the site but leaves its images
in the bucket — harmless, and re-adding the same id picks them right up
without re-uploading.

## Notes

- Images upload as webp (~150–400KB/page at 2000px wide); on browsers that
  can't encode webp (older Safari) the whole book falls back to png
  automatically.
- Only admins (the `admins` table) can reach any of this; the upload URLs
  are minted server-side per page, so even an admin session can't write
  arbitrary bucket keys.
- The built-in books (`arban`, `charlier`) are compiled in and can't be
  overridden by an upload.
