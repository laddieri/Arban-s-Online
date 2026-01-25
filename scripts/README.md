# PDF Conversion Scripts

These scripts help you convert your Arban's Method PDF to web-optimized images.

## Why Convert to Images?

- **Faster loading**: 2-3x faster than PDF rendering
- **Better mobile**: Smoother scrolling on phones/tablets
- **Smaller files**: WebP format is 30-50% smaller
- **Progressive loading**: Only load pages as needed

## Quick Start

### Method 1: Using pdftoppm (Recommended - Most Reliable)

**Install pdftoppm:**
```bash
# macOS
brew install poppler

# Ubuntu/Debian
sudo apt-get install poppler-utils

# Windows
# Download from: http://blog.alivate.com.au/poppler-windows/
```

**Convert your PDF:**
```bash
# Basic usage (creates JPG images at 300 DPI)
./scripts/convert-pdf.sh arbans-method.pdf

# Custom options
./scripts/convert-pdf.sh arbans-method.pdf output-folder 300 jpg

# PNG format (larger files but lossless)
./scripts/convert-pdf.sh arbans-method.pdf pdf-pages 300 png
```

### Method 2: Using Python (Best Quality/Optimization)

**Install dependencies:**
```bash
# Install poppler first (see above)

# Then install Python packages
pip install pdf2image Pillow
```

**Convert your PDF:**
```bash
# Basic usage (creates WebP images)
python scripts/convert-pdf.py arbans-method.pdf

# Custom options: output-dir format dpi quality
python scripts/convert-pdf.py arbans-method.pdf pdf-pages webp 300 90

# JPG format
python scripts/convert-pdf.py arbans-method.pdf pdf-pages jpg 300 90
```

## Troubleshooting ImageMagick Error

If you're getting the `error/pdf.c/ReadPDFImage/713` error with ImageMagick:

### Fix 1: Edit ImageMagick Policy File

```bash
# Find policy.xml
# macOS (Homebrew): /usr/local/etc/ImageMagick-7/policy.xml
# Linux: /etc/ImageMagick-6/policy.xml
# Windows: C:\Program Files\ImageMagick-7.x.x\policy.xml

# Edit the file and find this line:
<policy domain="coder" rights="none" pattern="PDF" />

# Change to:
<policy domain="coder" rights="read|write" pattern="PDF" />
```

### Fix 2: Use pdftoppm Instead (Easier!)

pdftoppm doesn't have the security restrictions and is often faster:

```bash
pdftoppm -jpeg -r 300 arbans-method.pdf page
```

## Output

Both scripts create numbered image files:
```
pdf-pages/
  page-001.jpg
  page-002.jpg
  page-003.jpg
  ...
```

## Recommended Settings

| Use Case | Format | DPI | Quality | File Size/Page |
|----------|--------|-----|---------|----------------|
| **Best quality** | PNG | 300 | - | ~2-3 MB |
| **Balanced** | JPG | 300 | 90 | ~400-600 KB |
| **Best for web** | WebP | 300 | 90 | ~200-400 KB |
| **Mobile optimized** | WebP | 200 | 85 | ~100-200 KB |

## Next Steps

After converting:

1. **Upload images** to your hosting service (see HOSTING-GUIDE.md)
2. **Update the app** to use images instead of PDF viewer
3. Let me know and I'll modify the code to use the image gallery!

## Format Comparison

**WebP** (Recommended)
- Smallest file size (30-50% smaller than JPG)
- Supported by all modern browsers
- Best balance of quality and size

**JPG** (Good compatibility)
- Universal support
- Good compression
- Slight quality loss from compression

**PNG** (Archival quality)
- Lossless quality
- Large file sizes (5-10x bigger than WebP)
- Use only if quality is critical
