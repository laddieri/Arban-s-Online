// OCR the pages produced by scripts/pdf-extract.py and emit one text blob
// per PDF page, ready for curating exercise titles into config/tocSections.ts.
//
// Usage:
//   npm install --no-save tesseract.js @tesseract.js-data/eng
//   node scripts/extract-exercise-titles.mjs <extract-dir> [start-page] [end-page]
//
// Reads <extract-dir>/manifest.json (text-layer pages pass through; image
// pages are OCRed) and writes <extract-dir>/pages.json: { "12": "page text", ... }
// keyed by 1-based PDF page number. Rerunning skips pages already present.
import { createWorker } from 'tesseract.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const [dir, startArg, endArg] = process.argv.slice(2);
if (!dir) {
  console.error('usage: node scripts/extract-exercise-titles.mjs <extract-dir> [start] [end]');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const outPath = path.join(dir, 'pages.json');
const pages = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : {};

const pageNos = Object.keys(manifest)
  .map(Number)
  .filter(n => (!startArg || n >= +startArg) && (!endArg || n <= +endArg))
  .sort((a, b) => a - b);

const langPath = path.dirname(require.resolve('@tesseract.js-data/eng/package.json'));

const worker = await createWorker('eng', 1, {
  langPath: path.join(langPath, '4.0.0_best_int'),
  gzip: true,
  cacheMethod: 'none',
});

let done = 0;
for (const pageNo of pageNos) {
  if (pages[pageNo]) { done++; continue; }
  const entry = manifest[pageNo];
  if (entry.text) {
    pages[pageNo] = entry.text;
  } else {
    const { data } = await worker.recognize(path.join(dir, entry.image));
    pages[pageNo] = data.text;
  }
  done++;
  if (done % 10 === 0 || done === pageNos.length) {
    writeFileSync(outPath, JSON.stringify(pages, null, 1));
    console.error(`  ${done}/${pageNos.length} pages`);
  }
}

writeFileSync(outPath, JSON.stringify(pages, null, 1));
await worker.terminate();
console.log(`wrote ${outPath} (${Object.keys(pages).length} pages)`);
