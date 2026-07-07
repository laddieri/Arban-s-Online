#!/usr/bin/env python3
"""Extract per-page text from the Arban's method PDF for the search index.

For pages with an embedded text layer the text is captured directly; pages
without one (pure image scans) are rendered to PNG for OCR by
scripts/extract-exercise-titles.mjs.

Usage:
    pip install pypdfium2 pillow
    python scripts/pdf-extract.py arbans-method.pdf out-dir [dpi]

Writes out-dir/manifest.json mapping 1-based PDF page numbers to either
{"text": ...} or {"image": "page-NNN.png"}.
"""
import json
import os
import sys

import pypdfium2 as pdfium


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    pdf_path = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) > 2 else "pdf-extract"
    dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 200

    os.makedirs(out_dir, exist_ok=True)
    pdf = pdfium.PdfDocument(pdf_path)
    manifest = {}
    rendered = 0

    for i in range(len(pdf)):
        page_no = i + 1
        page = pdf[i]
        text = page.get_textpage().get_text_range().strip()
        if len(text) >= 20:
            manifest[page_no] = {"text": text}
        else:
            name = f"page-{page_no:03d}.png"
            bitmap = page.render(scale=dpi / 72)
            bitmap.to_pil().save(os.path.join(out_dir, name))
            manifest[page_no] = {"image": name}
            rendered += 1
        if page_no % 25 == 0:
            print(f"  processed {page_no}/{len(pdf)} pages", file=sys.stderr)

    with open(os.path.join(out_dir, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=1)

    print(
        f"done: {len(pdf)} pages, {len(pdf) - rendered} with text layer, "
        f"{rendered} rendered for OCR -> {out_dir}/manifest.json"
    )


if __name__ == "__main__":
    main()
