# Hosting Guide for Arban's Method Images

## Recommended Approach: Cloudflare R2

### Why Cloudflare R2?
- **Fast loading**: Images load quickly via global CDN
- **Cost effective**: No egress fees (bandwidth is free!)
- **Better mobile experience**: Optimized images work great on phones
- **Progressive loading**: Pages load on demand

## Step-by-Step Setup

### 1. Convert PDF to Images (if not done)

```bash
# Install ImageMagick if you don't have it
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick
# Windows: Download from imagemagick.org

# Create output directory
mkdir pdf-pages

# Convert PDF to WebP images (best compression)
convert -density 300 arbans-method.pdf -quality 90 pdf-pages/page-%03d.webp

# Or use JPG if WebP not supported
convert -density 300 arbans-method.pdf -quality 90 pdf-pages/page-%03d.jpg
```

### 2. Set Up Cloudflare R2

1. Sign up at https://www.cloudflare.com/
2. Go to R2 Object Storage
3. Create a new bucket: `arbans-method-pages`
4. Upload all your images to the bucket
5. Configure public access:
   - Go to Settings → Public Access
   - Connect to a custom domain or use R2.dev subdomain
6. Enable CORS:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"]
  }
]
```

### 3. Update Your Environment

Set your `.env.local` file:
```
NEXT_PUBLIC_IMAGE_BASE_URL=https://your-bucket.r2.dev
```

## Alternative Hosting Options

### Vercel Blob (Easiest for Vercel deployments)

```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
vercel link

# Upload images
vercel blob put page-001.jpg --token YOUR_TOKEN
```

### Internet Archive (Best for Public Domain)

1. Go to https://archive.org/
2. Create account
3. Upload your images
4. Get the public URL
5. Use in your app (CORS-friendly)

## Cost Comparison

| Service | Storage (1 GB) | Bandwidth (100 GB/mo) | Free Tier |
|---------|---------------|----------------------|-----------|
| Cloudflare R2 | $0.015/mo | $0 (no egress!) | 10 GB + 10M requests/mo |
| AWS S3 | $0.023/mo | ~$9/mo | 5 GB + 15 GB/mo (12 months) |
| Vercel Blob | Included | Varies | 500 MB |
| Internet Archive | Free | Free | Unlimited |

## Image Format Recommendations

| Format | Best For | Size vs JPG |
|--------|----------|-------------|
| WebP | Modern browsers | 25-35% smaller |
| AVIF | Cutting edge | 40-50% smaller |
| JPG | Maximum compatibility | Baseline |

Typical size: 200-500 KB per page at good quality.

## Recommendation by Use Case

### Personal Use / Learning
→ **Internet Archive** (free, permanent)

### Production App / High Traffic
→ **Cloudflare R2** (best performance, cost-effective)

### Quick Prototype
→ **Vercel Blob** (easiest setup)
