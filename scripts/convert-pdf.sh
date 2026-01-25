#!/bin/bash
# Convert PDF to images using pdftoppm (most reliable method)
# Requires: poppler-utils
#   macOS: brew install poppler
#   Ubuntu: sudo apt-get install poppler-utils
#   Windows: Download from http://blog.alivate.com.au/poppler-windows/

PDF_FILE="${1:-arbans-method.pdf}"
OUTPUT_DIR="${2:-pdf-pages}"
DPI="${3:-300}"
FORMAT="${4:-jpg}"  # jpg or png

# Check if PDF exists
if [ ! -f "$PDF_FILE" ]; then
    echo "Error: PDF file '$PDF_FILE' not found"
    echo "Usage: ./convert-pdf.sh <pdf-file> [output-dir] [dpi] [format]"
    exit 1
fi

# Check if pdftoppm is installed
if ! command -v pdftoppm &> /dev/null; then
    echo "Error: pdftoppm not found. Please install poppler-utils:"
    echo "  macOS: brew install poppler"
    echo "  Ubuntu/Debian: sudo apt-get install poppler-utils"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "Converting $PDF_FILE to $FORMAT images at $DPI DPI..."
echo "Output directory: $OUTPUT_DIR"

# Convert based on format
if [ "$FORMAT" = "png" ]; then
    pdftoppm -png -r "$DPI" "$PDF_FILE" "$OUTPUT_DIR/page"
elif [ "$FORMAT" = "jpg" ] || [ "$FORMAT" = "jpeg" ]; then
    pdftoppm -jpeg -r "$DPI" -jpegopt quality=90 "$PDF_FILE" "$OUTPUT_DIR/page"
else
    echo "Error: Unsupported format '$FORMAT'. Use 'jpg' or 'png'"
    exit 1
fi

# Count output files
NUM_FILES=$(find "$OUTPUT_DIR" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$OUTPUT_DIR" | cut -f1)

echo ""
echo "✓ Successfully converted $NUM_FILES pages"
echo "  Location: $OUTPUT_DIR/"
echo "  Total size: $TOTAL_SIZE"
echo ""
echo "Next steps:"
echo "  1. Upload images to your hosting service (Cloudflare R2, etc.)"
echo "  2. Update the app to use images instead of PDF"
echo "  3. Run: npm run dev"
