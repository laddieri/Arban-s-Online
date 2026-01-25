# Setup Guide - Image-Based E-Book Viewer

This guide will help you configure the application to use your Cloudflare R2 bucket (or other image hosting service).

## Quick Setup (3 Steps)

### Step 1: Configure Your Settings

Copy the example environment file and update it with your settings:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Cloudflare bucket URL and settings:

```bash
# Your Cloudflare R2 public bucket URL
NEXT_PUBLIC_IMAGE_BASE_URL=https://pub-abc123def456.r2.dev

# Total number of pages (count your uploaded images)
NEXT_PUBLIC_TOTAL_PAGES=350

# Image format (jpg, png, or webp)
NEXT_PUBLIC_IMAGE_FORMAT=jpg
```

### Step 2: Update Table of Contents Page Numbers

Open `components/TableOfContents.tsx` and update the page numbers to match your PDF:

```typescript
const sections: Section[] = [
  {
    title: "Title Page & Introduction",
    page: 1,  // ← Update these numbers
  },
  {
    title: "Part 1: First Studies",
    page: 5,  // ← To match your actual PDF
    subsections: [
      { title: "The Study of Syncopation", page: 10 },
      // ... etc
    ],
  },
  // ... rest of sections
];
```

### Step 3: Run the Application

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Detailed Configuration

### Finding Your Cloudflare R2 Public URL

1. Log in to your Cloudflare dashboard
2. Navigate to R2 → Your bucket
3. Go to Settings → Public Access
4. Your public URL will look like: `https://pub-abc123def456.r2.dev`

**Important:** Make sure your bucket has public access enabled!

### Image Naming Convention

The application expects your images to be named with the following pattern:

```
page-001.jpg
page-002.jpg
page-003.jpg
...
page-350.jpg
```

- **3-digit page numbers** with leading zeros (001, 002, 003, etc.)
- **Consistent file extension** (jpg, png, or webp)
- All images should be in the **root of your bucket**, not in a subfolder

If your images are in a subfolder, update your `NEXT_PUBLIC_IMAGE_BASE_URL`:

```bash
# Images in root
NEXT_PUBLIC_IMAGE_BASE_URL=https://pub-abc123.r2.dev

# Images in a subfolder
NEXT_PUBLIC_IMAGE_BASE_URL=https://pub-abc123.r2.dev/arbans-method
```

### Counting Total Pages

To find your total page count:

**Windows:**
```cmd
dir /b pdf-pages | find /c ".jpg"
```

**macOS/Linux:**
```bash
ls pdf-pages | wc -l
```

Or check the last file number in your image folder.

### Verifying Your Setup

Test that your images are accessible:

1. Open your browser
2. Navigate to: `https://YOUR-BUCKET-URL/page-001.jpg`
3. You should see the first page of your book

If you see an error:
- Check that public access is enabled on your bucket
- Verify the URL is correct
- Check that the image file exists with the correct name

## Alternative Hosting Services

### Using a Custom Domain with Cloudflare R2

1. In Cloudflare R2, connect a custom domain to your bucket
2. Update `.env.local`:
```bash
NEXT_PUBLIC_IMAGE_BASE_URL=https://arbans.yourdomain.com
```

3. Update `next.config.js` to allow your domain:
```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'yourdomain.com',
    },
  ],
}
```

### Using Other Services (AWS S3, Vercel Blob, etc.)

The app works with any public image hosting service. Just update the `NEXT_PUBLIC_IMAGE_BASE_URL` to point to your service's public URL.

**AWS S3 Example:**
```bash
NEXT_PUBLIC_IMAGE_BASE_URL=https://your-bucket.s3.amazonaws.com
```

**Vercel Blob Example:**
```bash
NEXT_PUBLIC_IMAGE_BASE_URL=https://your-blob-url.public.blob.vercel-storage.com
```

## Troubleshooting

### Images Not Loading

**Check 1: CORS Configuration**

Make sure your bucket allows cross-origin requests. In Cloudflare R2:

1. Go to Settings → CORS Policy
2. Add this policy:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"]
  }
]
```

**Check 2: Public Access**

Verify your bucket is publicly accessible:
- Cloudflare R2: Settings → Public Access → Enabled
- AWS S3: Permissions → Block Public Access → Turn off
- Make sure bucket policy allows public reads

**Check 3: Image Naming**

Open browser console (F12) and check the network tab. Look at the URLs being requested:
- Should be: `https://your-bucket/page-001.jpg`
- Verify the format matches your actual filenames

### Wrong Number of Pages

If the page counter shows wrong total:
- Count your actual images
- Update `NEXT_PUBLIC_TOTAL_PAGES` in `.env.local`
- Restart the dev server (`npm run dev`)

### Table of Contents Not Working

If clicking sections doesn't go to the right page:
- Open the first few sections in the app
- Note the actual page numbers
- Update the `sections` array in `components/TableOfContents.tsx`

## Performance Optimization

### Image Optimization Tips

1. **Use WebP format** for 30-50% smaller files:
```bash
NEXT_PUBLIC_IMAGE_FORMAT=webp
```

2. **Optimal DPI:** 300 DPI for high-quality reading, 200 DPI for faster loading

3. **Enable Cloudflare Caching:**
   - Your images will be automatically cached on Cloudflare's CDN
   - First load may be slow, subsequent loads will be very fast

4. **Preloading:** The app automatically preloads the next and previous pages for smooth navigation

## Next Steps

1. Test the application thoroughly
2. Update the table of contents page numbers
3. Deploy to production (see main README.md)
4. Share with fellow musicians!

## Need Help?

- Check the main `README.md` for general documentation
- See `HOSTING-GUIDE.md` for detailed hosting options
- See `scripts/README.md` for PDF conversion help
