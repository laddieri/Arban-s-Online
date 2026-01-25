#!/usr/bin/env python3
"""
Convert PDF to optimized images for web display
Requires: pip install pdf2image Pillow
Also requires: poppler (brew install poppler / apt-get install poppler-utils)
"""

import os
import sys
import platform
from pdf2image import convert_from_path
from PIL import Image

def find_poppler_path():
    """Auto-detect poppler path on Windows"""
    if platform.system() != 'Windows':
        return None

    # Common Windows poppler locations
    possible_paths = [
        r'C:\poppler\Library\bin',
        r'C:\Program Files\poppler\Library\bin',
        r'C:\poppler-23.11.0\Library\bin',
        os.path.join(os.environ.get('PROGRAMFILES', ''), 'poppler', 'Library', 'bin'),
    ]

    for path in possible_paths:
        if os.path.exists(path):
            print(f"Found poppler at: {path}")
            return path

    print("\nWarning: Could not auto-detect poppler path on Windows.")
    print("If conversion fails, download poppler from:")
    print("  https://github.com/oschwartz10612/poppler-windows/releases")
    print("Extract to C:\\poppler and try again.")
    return None

def convert_pdf_to_images(pdf_path, output_dir='pdf-pages', format='webp', dpi=300, quality=90, poppler_path=None):
    """
    Convert PDF to web-optimized images

    Args:
        pdf_path: Path to PDF file
        output_dir: Directory to save images
        format: 'webp', 'jpg', or 'png'
        dpi: Resolution (300 recommended for sheet music)
        quality: Compression quality (90 recommended)
        poppler_path: Path to poppler bin directory (Windows only)
    """

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    print(f"Converting {pdf_path} to {format.upper()} images at {dpi} DPI...")

    # Auto-detect poppler on Windows if not provided
    if poppler_path is None and platform.system() == 'Windows':
        poppler_path = find_poppler_path()

    # Convert PDF to images
    try:
        pages = convert_from_path(pdf_path, dpi=dpi, poppler_path=poppler_path)
    except Exception as e:
        print(f"\n❌ Error converting PDF: {e}")
        if platform.system() == 'Windows':
            print("\nOn Windows, you need poppler installed:")
            print("  1. Download: https://github.com/oschwartz10612/poppler-windows/releases")
            print("  2. Extract to C:\\poppler")
            print("  3. Try again, or specify path:")
            print("     python convert-pdf.py yourfile.pdf pdf-pages webp 300 90 C:\\poppler\\Library\\bin")
        else:
            print("\nMake sure poppler is installed:")
            print("  macOS: brew install poppler")
            print("  Linux: sudo apt-get install poppler-utils")
        sys.exit(1)

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
    if len(sys.argv) < 2:
        print("Usage: python convert-pdf.py <pdf-file> [output-dir] [format] [dpi] [quality] [poppler-path]")
        print("\nExamples:")
        print("  python convert-pdf.py arbans-method.pdf")
        print("  python convert-pdf.py arbans-method.pdf pdf-pages webp 300 90")
        print("  python convert-pdf.py arbans-method.pdf pdf-pages jpg 300 90 C:\\poppler\\Library\\bin")
        sys.exit(1)

    pdf_file = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else 'pdf-pages'
    format_type = sys.argv[3] if len(sys.argv) > 3 else 'webp'
    dpi = int(sys.argv[4]) if len(sys.argv) > 4 else 300
    quality = int(sys.argv[5]) if len(sys.argv) > 5 else 90
    poppler_path = sys.argv[6] if len(sys.argv) > 6 else None

    if not os.path.exists(pdf_file):
        print(f"Error: File '{pdf_file}' not found")
        sys.exit(1)

    convert_pdf_to_images(pdf_file, output_dir, format_type, dpi, quality, poppler_path)
