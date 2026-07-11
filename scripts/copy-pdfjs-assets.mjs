// Copy pdf.js runtime assets into public/ so the admin book uploader can
// fetch them same-origin. pdf.js decodes JBIG2/JPEG-2000 scan images (very
// common in IMSLP scans) with wasm modules requested at render time from
// `wasmUrl` - without these files those pages silently render blank white.
//
// Runs as predev/prebuild (see package.json); public/pdfjs/ is gitignored
// so the copies always match the installed pdfjs-dist version.
import { cpSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'node_modules', 'pdfjs-dist');
const dest = path.join(root, 'public', 'pdfjs');

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

// wasm: JBIG2 + openjpeg (JPX) image decoders, qcms (ICC color)
cpSync(path.join(src, 'wasm'), path.join(dest, 'wasm'), { recursive: true });
// standard_fonts: metrics for PDFs that use non-embedded base fonts
cpSync(path.join(src, 'standard_fonts'), path.join(dest, 'standard_fonts'), {
  recursive: true,
});
// cmaps: character maps, needed by some text-layer PDFs
cpSync(path.join(src, 'cmaps'), path.join(dest, 'cmaps'), { recursive: true });

// tesseract.js runtime for the admin TOC "suggest titles" OCR (public/ocr/):
// worker + the single-file wasm cores tesseract picks between + English data.
// All fetched lazily, only when an admin runs the suggestion scan.
const ocrDest = path.join(root, 'public', 'ocr');
rmSync(ocrDest, { recursive: true, force: true });
mkdirSync(ocrDest, { recursive: true });
cpSync(
  path.join(root, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js'),
  path.join(ocrDest, 'worker.min.js')
);
for (const core of [
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
]) {
  cpSync(
    path.join(root, 'node_modules', 'tesseract.js-core', core),
    path.join(ocrDest, core)
  );
}
cpSync(
  path.join(root, 'node_modules', '@tesseract.js-data', 'eng', '4.0.0', 'eng.traineddata.gz'),
  path.join(ocrDest, 'eng.traineddata.gz')
);

console.log('pdf.js assets copied to public/pdfjs/, OCR assets to public/ocr/');
