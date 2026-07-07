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

export default function globalSetup() {
  mkdirSync(IMAGE_DIR, { recursive: true });
  if (existsSync(IMAGE_DIR) && readdirSync(IMAGE_DIR).length >= PAGE_COUNT) {
    return; // already generated
  }
  const png = makePagePng();
  for (let i = 0; i < PAGE_COUNT; i++) {
    writeFileSync(path.join(IMAGE_DIR, `page-${String(i).padStart(3, '0')}.png`), png);
  }
  console.log(`generated ${PAGE_COUNT} test page images in ${IMAGE_DIR}`);
}
