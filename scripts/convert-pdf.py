#!/usr/bin/env python3
"""
Convert PDF to optimized images for web display
Requires: pip install pdf2image Pillow
Also requires: poppler (brew install poppler / apt-get install poppler-utils)
"""

import os
from pdf2image import convert_from_path
from PIL import Image

def convert_pdf_to_images(pdf_path, output_dir='pdf-pages', format='webp', dpi=300, quality=90):
    """
    Convert PDF to web-optimized images

    Args:
        pdf_path: Path to PDF file
        output_dir: Directory to save images
        format: 'webp', 'jpg', or 'png'
        dpi: Resolution (300 recommended for sheet music)
        quality: Compression quality (90 recommended)
    """

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    print(f"Converting {pdf_path} to {format.upper()} images at {dpi} DPI...")

    # Convert PDF to images
    pages = convert_from_path(pdf_path, dpi=dpi)

    print(f"Found {len(pages)} pages")

    # Save each page
    for i, page in enumerate(pages, start=1):
        output_path = os.path.join(output_dir, f'page-{i:03d}.{format}')

        # Save with optimization
        if format.lower() == 'webp':
            page.save(output_path, 'WEBP', quality=quality, method=6)
        elif format.lower() in ['jpg', 'jpeg']:
            page.save(output_path, 'JPEG', quality=quality, optimize=True)
        elif format.lower() == 'png':
            page.save(output_path, 'PNG', optimize=True)

        file_size = os.path.getsize(output_path) / 1024  # KB
        print(f"  Saved page {i}/{len(pages)}: {output_path} ({file_size:.1f} KB)")

    print(f"\n✓ Successfully converted {len(pages)} pages to {output_dir}/")
    print(f"  Total size: {sum(os.path.getsize(os.path.join(output_dir, f)) for f in os.listdir(output_dir)) / 1024 / 1024:.1f} MB")

if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python convert-pdf.py <pdf-file> [output-dir] [format] [dpi] [quality]")
        print("\nExamples:")
        print("  python convert-pdf.py arbans-method.pdf")
        print("  python convert-pdf.py arbans-method.pdf pdf-pages webp 300 90")
        sys.exit(1)

    pdf_file = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else 'pdf-pages'
    format_type = sys.argv[3] if len(sys.argv) > 3 else 'webp'
    dpi = int(sys.argv[4]) if len(sys.argv) > 4 else 300
    quality = int(sys.argv[5]) if len(sys.argv) > 5 else 90

    if not os.path.exists(pdf_file):
        print(f"Error: File '{pdf_file}' not found")
        sys.exit(1)

    convert_pdf_to_images(pdf_file, output_dir, format_type, dpi, quality)
