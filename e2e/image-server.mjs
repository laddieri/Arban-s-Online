// Tiny static server for the generated test page images (see global-setup.ts).
// The app under test is built with NEXT_PUBLIC_IMAGE_BASE_URL=http://localhost:8080.
// Also accepts PUT (standing in for R2 presigned uploads in the admin-books
// e2e test): bodies are written under .test-images/ so GET serves them back.
import { createServer } from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '.test-images');
const port = 8080;

const KEY_PATTERN = /^\/(?:([\w-]+)\/)?(page-\d{3}\.(?:png|webp))$/;

createServer(async (req, res) => {
  // Browser uploads are cross-origin (app on :3000, server on :8080)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200);
    res.end('ok');
    return;
  }

  const urlPath = req.url.split('?')[0];
  const match = urlPath.match(KEY_PATTERN);
  if (!match) {
    res.writeHead(404);
    res.end();
    return;
  }
  const [, subdir, name] = match;
  const filePath = subdir ? path.join(dir, subdir, name) : path.join(dir, name);

  if (req.method === 'PUT') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    try {
      if (subdir) await mkdir(path.join(dir, subdir), { recursive: true });
      await writeFile(filePath, Buffer.concat(chunks));
      res.writeHead(200);
      res.end();
    } catch (err) {
      console.error('PUT failed:', err);
      res.writeHead(500);
      res.end();
    }
    return;
  }

  try {
    const data = await readFile(filePath);
    const type = name.endsWith('.webp') ? 'image/webp' : 'image/png';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(port, () => console.log(`image server on :${port}`));
