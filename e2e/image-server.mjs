// Tiny static server for the generated test page images (see global-setup.ts).
// The app under test is built with NEXT_PUBLIC_IMAGE_BASE_URL=http://localhost:8080.
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '.test-images');
const port = 8080;

createServer(async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('ok');
    return;
  }
  const name = path.basename(req.url.split('?')[0]);
  if (!/^page-\d{3}\.png$/.test(name)) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    const data = await readFile(path.join(dir, name));
    res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(port, () => console.log(`image server on :${port}`));
