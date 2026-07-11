import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { deflateSync } from 'zlib';
import path from 'path';

// Generate the stand-in page images the e2e suite runs against: valid PNGs
// with roughly the aspect ratio of a scanned book page. No browser or
// external CDN needed - plain Node, written once per checkout.

const IMAGE_DIR = path.join(__dirname, '.test-images');
const PAGE_COUNT = 355; // page-000 .. page-354, matching the real bucket
const WIDTH = 800;
const HEIGHT = 1035;

function crc32(buf: Buffer): number {
  let c: number;
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function makePagePng(): Buffer {
  // Parchment-tinted background with dark "staff lines" so tests can tell
  // page content from printer-margin white space
  const raw = Buffer.alloc(HEIGHT * (1 + WIDTH * 3));
  for (let y = 0; y < HEIGHT; y++) {
    const row = y * (1 + WIDTH * 3);
    raw[row] = 0; // filter: none
    const isStaffLine = y > 400 && y < 700 && (y - 400) % 60 < 4;
    for (let x = 0; x < WIDTH; x++) {
      const px = row + 1 + x * 3;
      if (isStaffLine && x > 80 && x < WIDTH - 80) {
        raw[px] = 20; raw[px + 1] = 20; raw[px + 2] = 20;
      } else {
        raw[px] = 245; raw[px + 1] = 234; raw[px + 2] = 208;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const TEST_BOOK_DIR = path.join(IMAGE_DIR, 'testbook');
const TEST_BOOK_PAGES = 23; // totalPages 20 + offset 2, images page-000..022

// A small real PDF for the admin upload e2e test, printed by Chromium
const TEST_PDF = path.join(IMAGE_DIR, 'test-book.pdf');
const TEST_PDF_PAGES = 5;

// Page images with a large title in the top strip, for the admin TOC
// OCR-suggestion e2e test (served as the "ocrbook" test book's pages)
const OCR_BOOK_DIR = path.join(IMAGE_DIR, 'ocrbook');
const OCR_TITLES = ['STUDY No. 1', 'STUDY No. 2', 'STUDY No. 3'];

async function makeBrowserAssets() {
  const needPdf = !existsSync(TEST_PDF);
  const needOcr = !existsSync(path.join(OCR_BOOK_DIR, 'page-002.png'));
  if (!needPdf && !needOcr) return;

  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  });
  const page = await browser.newPage();

  if (needPdf) {
    const sections = Array.from(
      { length: TEST_PDF_PAGES },
      (_, i) => `<section><h1>Test PDF - page ${i + 1}</h1></section>`
    ).join('');
    await page.setContent(
      `<style>
        @page { size: 8.5in 11in; margin: 0; }
        body { margin: 0; }
        section { page-break-after: always; height: 11in; padding: 1in;
                  box-sizing: border-box; background: #f5ead0; font-size: 40px; }
        section:last-child { page-break-after: auto; }
      </style>${sections}`
    );
    await page.pdf({ path: TEST_PDF, preferCSSPageSize: true });
  }

  if (needOcr) {
    mkdirSync(OCR_BOOK_DIR, { recursive: true });
    const dataUrls: string[] = await page.evaluate(titles => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1035;
      const ctx = canvas.getContext('2d')!;
      return titles.map(title => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 800, 1035);
        ctx.fillStyle = '#111111';
        ctx.font = 'bold 44px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(title, 400, 90); // inside the top-20% OCR strip
        for (let y = 400; y < 700; y += 60) ctx.fillRect(100, y, 600, 4);
        return canvas.toDataURL('image/png');
      });
    }, OCR_TITLES);
    dataUrls.forEach((url, i) => {
      writeFileSync(
        path.join(OCR_BOOK_DIR, `page-${String(i).padStart(3, '0')}.png`),
        Buffer.from(url.split(',')[1], 'base64')
      );
    });
  }

  await browser.close();
}

export default async function globalSetup() {
  mkdirSync(IMAGE_DIR, { recursive: true });
  mkdirSync(TEST_BOOK_DIR, { recursive: true });
  const png = makePagePng();
  if (readdirSync(IMAGE_DIR).length < PAGE_COUNT + 1) {
    for (let i = 0; i < PAGE_COUNT; i++) {
      writeFileSync(path.join(IMAGE_DIR, `page-${String(i).padStart(3, '0')}.png`), png);
    }
  }
  if (readdirSync(TEST_BOOK_DIR).length < TEST_BOOK_PAGES) {
    for (let i = 0; i < TEST_BOOK_PAGES; i++) {
      writeFileSync(path.join(TEST_BOOK_DIR, `page-${String(i).padStart(3, '0')}.png`), png);
    }
  }
  await makeBrowserAssets();
  console.log(`test page images ready in ${IMAGE_DIR} (+ testbook/, ocrbook/, test-book.pdf)`);
}
