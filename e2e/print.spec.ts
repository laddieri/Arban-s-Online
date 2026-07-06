import { test, expect, Page, Frame, BrowserContext } from '@playwright/test';

// Print output geometry: zero margins, Fill/Fit scaling, one sheet per page,
// preface-page support, and the failed-image warning.

async function openDialogWithRange(page: Page, from: string, to: string) {
  await page.locator('button[title="Print pages"]').click();
  await page.getByRole('radio', { name: 'Page range' }).check();
  const texts = page.locator('input[type="text"][title*="Page number"]');
  await texts.nth(0).fill(from);
  await texts.nth(1).fill(to);
}

async function getPrintFrame(page: Page): Promise<Frame> {
  await page.waitForFunction(() => {
    const frames = document.querySelectorAll('iframe[aria-hidden="true"]');
    const f = frames[frames.length - 1] as HTMLIFrameElement | undefined;
    return (
      !!f &&
      !!f.contentDocument &&
      f.contentDocument.querySelectorAll('.page img').length > 0 &&
      Array.from(f.contentDocument.images).every(i => i.complete)
    );
  }, { timeout: 20000 });
  const frames = page.frames();
  for (let i = frames.length - 1; i >= 0; i--) {
    if ((await frames[i].locator('.page').count().catch(() => 0)) > 0) return frames[i];
  }
  throw new Error('print frame not found');
}

interface PrintMeasurement {
  objectFit: string;
  boxW: number; boxH: number; boxLeft: number; boxTop: number;
  contentW: number; contentH: number;
  whiteLR: number; whiteTB: number;
  pages: number;
  srcs: string[];
  html: string;
}

async function measure(frame: Frame): Promise<PrintMeasurement> {
  return frame.evaluate(() => {
    const IN = 96; // CSS px per inch
    const pageEl = document.querySelector('.page')!;
    const img = pageEl.querySelector('img')!;
    const box = pageEl.getBoundingClientRect();
    const style = getComputedStyle(img);
    const fitFn = style.objectFit === 'cover' ? Math.max : Math.min;
    const fit = fitFn(box.width / img.naturalWidth, box.height / img.naturalHeight);
    const zoom = new DOMMatrix(style.transform).a || 1;
    const contentW = (img.naturalWidth * fit * zoom) / IN;
    const contentH = (img.naturalHeight * fit * zoom) / IN;
    return {
      objectFit: style.objectFit,
      boxW: +(box.width / IN).toFixed(3),
      boxH: +(box.height / IN).toFixed(3),
      boxLeft: +(box.left / IN).toFixed(3),
      boxTop: +(box.top / IN).toFixed(3),
      contentW: +contentW.toFixed(3),
      contentH: +contentH.toFixed(3),
      whiteLR: +Math.max(0, (box.width / IN - contentW) / 2).toFixed(3),
      whiteTB: +Math.max(0, (box.height / IN - contentH) / 2).toFixed(3),
      pages: document.querySelectorAll('.page').length,
      srcs: Array.from(document.images).map(i => i.src.split('/').pop()!),
      html: document.documentElement.outerHTML,
    };
  });
}

// Ground truth: render the print document standalone and inspect the PDF
async function pdfStats(context: BrowserContext, html: string) {
  const p = await context.newPage();
  await p.setContent(html, { waitUntil: 'networkidle' });
  const pdf = await p.pdf({ preferCSSPageSize: true });
  await p.close();
  const raw = pdf.toString('latin1');
  const sizes = [
    ...new Set(
      [...raw.matchAll(/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/g)].map(
        m => `${(+m[1] / 72).toFixed(2)}x${(+m[2] / 72).toFixed(2)}`
      )
    ),
  ];
  const sheets = (raw.match(/\/Type\s*\/Page[^s]/g) || []).length;
  return { sheets, sizes };
}

test.beforeEach(async ({ page, context }) => {
  await context.addInitScript(() => {
    window.print = () => { (window as any).__printCalled = true; };
    (window as any).__confirmMsg = null;
    window.confirm = (msg?: string) => { (window as any).__confirmMsg = msg; return false; };
  });
  await page.goto('/?page=50');
});

test('Fill mode prints edge-to-edge with zero white space', async ({ page, context }) => {
  await openDialogWithRange(page, '50', '51');
  await page.getByRole('button', { name: 'Print', exact: true }).click();
  const m = await measure(await getPrintFrame(page));

  expect(m.boxW).toBe(8.5);
  expect(m.boxH).toBe(11);
  expect(m.boxLeft).toBe(0);
  expect(m.boxTop).toBe(0);
  expect(m.objectFit).toBe('cover');
  expect(m.whiteLR).toBe(0);
  expect(m.whiteTB).toBe(0);
  // Fill crops only what the aspect mismatch requires - a fraction of an
  // inch, not the ~1.2-1.5in the old fixed 115% zoom threw away
  expect(Math.max(0, m.contentW - m.boxW)).toBeLessThan(0.3);
  expect(Math.max(0, m.contentH - m.boxH)).toBeLessThan(0.3);

  const pdf = await pdfStats(context, m.html);
  expect(pdf.sizes).toEqual(['8.50x11.00']);
  expect(pdf.sheets).toBe(m.pages); // no blank-sheet spillover
});

test('Fit mode shows the whole scan with no crop', async ({ page, context }) => {
  await openDialogWithRange(page, '50', '51');
  await page.getByRole('radio', { name: /Fit page/ }).check();
  await page.getByRole('button', { name: 'Print', exact: true }).click();
  const m = await measure(await getPrintFrame(page));

  expect(m.objectFit).toBe('contain');
  expect(m.contentW).toBeLessThanOrEqual(m.boxW + 0.001);
  expect(m.contentH).toBeLessThanOrEqual(m.boxH + 0.001);

  const pdf = await pdfStats(context, m.html);
  expect(pdf.sizes).toEqual(['8.50x11.00']);
  expect(pdf.sheets).toBe(m.pages);
});

test('preface pages print via Roman numeral ranges', async ({ page }) => {
  await openDialogWithRange(page, 'i', 'iii');
  await expect(page.getByText(/3 pages \(i - iii\)/)).toBeVisible();
  await page.getByRole('button', { name: 'Print', exact: true }).click();
  const m = await measure(await getPrintFrame(page));
  expect(m.srcs).toEqual(['page-000.png', 'page-001.png', 'page-002.png']);
});

test('failed images trigger a warning; cancel cleans up', async ({ page, context }) => {
  await context.route('**/page-058.png', r => r.abort());
  const framesBefore = await page.evaluate(
    () => document.querySelectorAll('iframe[aria-hidden="true"]').length
  );
  await openDialogWithRange(page, '50', '51'); // images 057 + 058; 058 aborted
  await page.getByRole('button', { name: 'Print', exact: true }).click();

  await page.waitForFunction(() => (window as any).__confirmMsg !== null, { timeout: 30000 });
  const msg = await page.evaluate(() => (window as any).__confirmMsg as string);
  expect(msg).toMatch(/1 of 2 page image\(s\) did not load/);

  // confirm stub returned false -> print aborted, frame removed
  await expect
    .poll(() => page.evaluate(() => document.querySelectorAll('iframe[aria-hidden="true"]').length))
    .toBe(framesBefore);
});
