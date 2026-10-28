'use client';

import { useState, useEffect } from 'react';
import { formatDisplayPageNumber, parseDisplayPageNumber, getMinPage } from '@/utils/pageFormat';
import { getPageContentBounds } from '@/lib/pageBounds';
import { computePrintPlacement } from '@/utils/printLayout';
import type { ContentBounds } from '@/utils/contentBounds';

interface PrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookId?: string;
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  imageFormat: string;
  pageOffset?: number;
  useImageProxy?: boolean;
  initialPages?: number[]; // Pre-selected pages (e.g., from a list)
}

export default function PrintDialog({
  isOpen,
  onClose,
  bookId = 'arban',
  currentPage,
  totalPages,
  baseUrl,
  imageFormat,
  pageOffset = 0,
  useImageProxy = false,
  initialPages
}: PrintDialogProps) {
  const [printMode, setPrintMode] = useState<'current' | 'range' | 'selection'>('current');
  const [startPage, setStartPage] = useState(currentPage);
  const [endPage, setEndPage] = useState(currentPage);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [selectedPages, setSelectedPages] = useState<number[]>([currentPage]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [paperSize, setPaperSize] = useState<'letter' | 'legal' | 'tabloid' | 'a3'>('letter');
  // 'auto' finds the printed music on each scan and scales it into uniform
  // margins, ignoring the scan's own uneven paper border;
  // 'fill' covers the whole sheet (no white space, crops scan edges as needed);
  // 'fit' shows the whole scan (may leave white bars if aspect ratios differ)
  const [fitMode, setFitMode] = useState<'auto' | 'fill' | 'fit'>('auto');
  const [printMargin, setPrintMargin] = useState(0.5); // inches, 'auto' only
  const [printZoom, setPrintZoom] = useState(100);

  const minPage = getMinPage(pageOffset);

  const marginOptions = [
    { value: 0.25, label: 'Narrow (¼ in)' },
    { value: 0.5, label: 'Normal (½ in)' },
    { value: 0.75, label: 'Wide (¾ in)' },
  ];

  const paperSizes: Record<string, { label: string; width: string; height: string; description: string }> = {
    letter: { label: 'Letter (Default)', width: '8.5in', height: '11in', description: 'Standard US letter paper' },
    legal: { label: 'Legal', width: '8.5in', height: '14in', description: 'Taller than letter, good for larger prints' },
    tabloid: { label: 'Tabloid / Ledger', width: '11in', height: '17in', description: 'Double letter size, great for wall display' },
    a3: { label: 'A3', width: '11.7in', height: '16.5in', description: 'International large format paper' },
  };

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (initialPages && initialPages.length > 0) {
        // If initial pages provided, use selection mode
        setPrintMode('selection');
        setSelectedPages(initialPages);
      } else {
        setPrintMode('current');
        setSelectedPages([currentPage]);
      }
      setStartPage(currentPage);
      setEndPage(currentPage);
      setStartInput(formatDisplayPageNumber(currentPage, pageOffset));
      setEndInput(formatDisplayPageNumber(currentPage, pageOffset));
    }
  }, [isOpen, currentPage, initialPages, pageOffset]);

  // Format page number with leading zeros
  const formatPageNumber = (num: number) => {
    return num.toString().padStart(3, '0');
  };

  // Get image URL for a page (apply offset to convert display page number to image file number)
  // When useImageProxy is true, route through /api/image/[page] to avoid firewall blocks
  const getProxyUrl = (pageNum: number) =>
    `/api/image/${formatPageNumber(pageNum + pageOffset)}?book=${bookId}`;
  const getImageUrl = (pageNum: number) => {
    if (useImageProxy) {
      return getProxyUrl(pageNum);
    }
    return `${baseUrl}/page-${formatPageNumber(pageNum + pageOffset)}.${imageFormat}`;
  };

  // Get pages to print based on mode
  const getPagesToPrint = (): number[] => {
    switch (printMode) {
      case 'current':
        return [currentPage];
      case 'range':
        const pages: number[] = [];
        const start = Math.min(startPage, endPage);
        const end = Math.max(startPage, endPage);
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
        return pages;
      case 'selection':
        return [...selectedPages].sort((a, b) => a - b);
      default:
        return [currentPage];
    }
  };

  // Toggle page in selection
  const togglePageSelection = (page: number) => {
    setSelectedPages(prev => {
      if (prev.includes(page)) {
        return prev.filter(p => p !== page);
      } else {
        return [...prev, page];
      }
    });
  };

  // Build the standalone print document. The @page margin is 0 and each
  // .page box is the full sheet; in 'auto' mode the margins are drawn by
  // placing each page's .crop window (see applyAutoMargins), otherwise the
  // only border is whatever the printer hardware can't reach.
  const buildPrintHtml = (pages: number[]) => {
    const paper = paperSizes[paperSize];
    const imagesHtml = pages
      .map((page) => {
        const img = `<img src="${getImageUrl(page)}" alt="Page ${formatDisplayPageNumber(page, pageOffset)}" />`;
        return `
        <div class="page">
          ${fitMode === 'auto' ? `<div class="crop">${img}</div>` : img}
        </div>
      `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Arban's Method - Print</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            @page {
              size: ${paper.width} ${paper.height} portrait;
              margin: 0;
            }

            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .page {
              width: ${paper.width};
              height: ${paper.height};
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              background: white;
              page-break-after: always;
              break-inside: avoid;
            }

            .page:last-child {
              page-break-after: auto;
            }

            .page {
              position: relative;
            }

            .crop {
              position: absolute;
              overflow: hidden;
            }

            .crop img {
              position: absolute;
              display: block;
              max-width: none;
            }

            .page > img {
              display: block;
              width: 100%;
              height: 100%;
              object-fit: ${fitMode === 'fit' ? 'contain' : 'cover'};
              transform: scale(${printZoom / 100});
              transform-origin: center center;
            }
          </style>
        </head>
        <body>${imagesHtml}</body>
      </html>
    `;
  };

  // Wait for the images in the print document to settle; resolves with the
  // number of images that failed to load (would print as blank sheets)
  const waitForImages = (images: HTMLImageElement[], timeoutMs: number): Promise<number> =>
    new Promise((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve(images.filter(img => !img.complete || img.naturalWidth === 0).length);
      };
      const timer = setTimeout(finish, timeoutMs);
      if (images.length === 0) {
        finish();
        return;
      }
      let settled = 0;
      const onSettle = () => {
        settled++;
        if (settled >= images.length) finish();
      };
      images.forEach(img => {
        if (img.complete) {
          onSettle();
        } else {
          img.onload = onSettle;
          img.onerror = onSettle;
        }
      });
    });

  // Position each page's content window so the printed music sits inside
  // uniform margins. Pages whose content couldn't be measured fit the whole
  // scan inside the margins instead.
  const applyAutoMargins = (doc: Document, bounds: (ContentBounds | null)[]) => {
    const paper = paperSizes[paperSize];
    const paperW = parseFloat(paper.width);
    const paperH = parseFloat(paper.height);
    doc.querySelectorAll<HTMLElement>('.crop').forEach((crop, i) => {
      const img = crop.querySelector('img');
      if (!img || !img.naturalWidth || !img.naturalHeight) return;
      const p = computePrintPlacement(
        bounds[i] ?? null, img.naturalWidth, img.naturalHeight, paperW, paperH, printMargin
      );
      crop.style.left = `${p.cropLeft}in`;
      crop.style.top = `${p.cropTop}in`;
      crop.style.width = `${p.cropWidth}in`;
      crop.style.height = `${p.cropHeight}in`;
      img.style.left = `${p.imageLeft}in`;
      img.style.top = `${p.imageTop}in`;
      img.style.width = `${p.imageWidth}in`;
      img.style.height = `${p.imageHeight}in`;
      // Turn toned/yellowed scan paper white so it doesn't print as a
      // tinted box inside the white margins
      const paper = bounds[i]?.paperLuminance;
      if (paper) {
        img.style.filter = `grayscale(1) brightness(${Math.min((255 / paper) * 1.04, 1.8).toFixed(3)})`;
      }
    });
  };

  // Handle print: render into a hidden same-origin iframe (no popup, so no
  // popup blockers), wait for images, then print the iframe document
  const handlePrint = async () => {
    const pages = getPagesToPrint();
    if (pages.length === 0) return;

    setIsPrinting(true);

    const iframe = document.createElement('iframe');
    try {
      iframe.setAttribute('aria-hidden', 'true');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if (!doc || !win) {
        throw new Error('Could not create print frame');
      }
      // Measure the music on each page while the print document loads
      const boundsPromise =
        fitMode === 'auto'
          ? Promise.all(pages.map(page => getPageContentBounds(getImageUrl(page), getProxyUrl(page))))
          : Promise.resolve([]);

      doc.open();
      doc.write(buildPrintHtml(pages));
      doc.close();

      // Give slow connections time proportional to the number of pages
      const timeoutMs = 10000 + pages.length * 500;
      const [failedCount, bounds] = await Promise.all([
        waitForImages(Array.from(doc.images), timeoutMs),
        boundsPromise,
      ]);
      if (fitMode === 'auto') {
        applyAutoMargins(doc, bounds);
      }

      if (failedCount > 0) {
        const proceed = window.confirm(
          `${failedCount} of ${pages.length} page image(s) did not load and would print as blank sheets. Print anyway?`
        );
        if (!proceed) {
          iframe.remove();
          return;
        }
      }

      win.focus();
      win.print();
      // Keep the frame alive while the browser's print dialog is open;
      // clean it up once printing has had ample time to spool
      setTimeout(() => iframe.remove(), 60000);
      onClose();
    } catch (error) {
      console.error('Print error:', error);
      iframe.remove();
      alert('An error occurred while preparing to print.');
    } finally {
      setIsPrinting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Print Pages
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* Print mode selection */}
          <div className="space-y-3">
            {/* Current page option */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="printMode"
                value="current"
                checked={printMode === 'current'}
                onChange={() => setPrintMode('current')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Current page ({formatDisplayPageNumber(currentPage, pageOffset)})
              </span>
            </label>

            {/* Page range option */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="printMode"
                value="range"
                checked={printMode === 'range'}
                onChange={() => setPrintMode('range')}
                className="w-4 h-4 text-blue-600 mt-1"
              />
              <div className="flex-1">
                <span className="text-gray-700 dark:text-gray-300">Page range</span>
                {printMode === 'range' && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={startInput}
                      onChange={(e) => {
                        setStartInput(e.target.value);
                        const parsed = parseDisplayPageNumber(e.target.value, pageOffset);
                        if (parsed !== null) {
                          setStartPage(Math.max(minPage, Math.min(totalPages, parsed)));
                        }
                      }}
                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700"
                      title="Page number (use i, ii, iii... for preface pages)"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="text"
                      value={endInput}
                      onChange={(e) => {
                        setEndInput(e.target.value);
                        const parsed = parseDisplayPageNumber(e.target.value, pageOffset);
                        if (parsed !== null) {
                          setEndPage(Math.max(minPage, Math.min(totalPages, parsed)));
                        }
                      }}
                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700"
                      title="Page number (use i, ii, iii... for preface pages)"
                    />
                  </div>
                )}
              </div>
            </label>

            {/* Custom selection option */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="printMode"
                value="selection"
                checked={printMode === 'selection'}
                onChange={() => setPrintMode('selection')}
                className="w-4 h-4 text-blue-600 mt-1"
              />
              <div className="flex-1">
                <span className="text-gray-700 dark:text-gray-300">
                  Select specific pages ({selectedPages.length} selected)
                </span>
              </div>
            </label>
          </div>

          {/* Page selection grid */}
          {printMode === 'selection' && (
            <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-8 gap-1">
                {Array.from({ length: totalPages - minPage + 1 }, (_, i) => minPage + i).map((page) => (
                  <button
                    key={page}
                    onClick={() => togglePageSelection(page)}
                    className={`p-1 text-xs rounded ${
                      selectedPages.includes(page)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {formatDisplayPageNumber(page, pageOffset)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Paper size selection */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Paper Size
            </label>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as 'letter' | 'legal' | 'tabloid' | 'a3')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm cursor-pointer"
            >
              {Object.entries(paperSizes).map(([key, size]) => (
                <option key={key} value={key}>
                  {size.label} ({size.width} x {size.height})
                </option>
              ))}
            </select>
            {paperSize !== 'letter' && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Make sure your printer has the selected paper size loaded, or select &quot;Fit to page&quot; in your browser&apos;s print dialog.
              </p>
            )}
          </div>

          {/* Image scaling mode */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Image Scaling
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="fitMode"
                  value="auto"
                  checked={fitMode === 'auto'}
                  onChange={() => setFitMode('auto')}
                  className="w-4 h-4 text-blue-600 mt-0.5"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Even margins</span> — finds the music on each
                  page and enlarges it to fill the sheet inside consistent margins
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="fitMode"
                  value="fill"
                  checked={fitMode === 'fill'}
                  onChange={() => setFitMode('fill')}
                  className="w-4 h-4 text-blue-600 mt-0.5"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Fill page</span> — no white space; trims the
                  scan&apos;s edges as needed to cover the whole sheet
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="fitMode"
                  value="fit"
                  checked={fitMode === 'fit'}
                  onChange={() => setFitMode('fit')}
                  className="w-4 h-4 text-blue-600 mt-0.5"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Fit page</span> — shows the entire scan;
                  may leave white bars on two sides
                </span>
              </label>
            </div>
          </div>

          {/* Margin size (even-margins mode) */}
          {fitMode === 'auto' && (
            <div className="mt-4">
              <label htmlFor="print-margin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Margins
              </label>
              <select
                id="print-margin"
                value={printMargin}
                onChange={(e) => setPrintMargin(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm cursor-pointer"
              >
                {marginOptions.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Print zoom */}
          {fitMode !== 'auto' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Extra Zoom: {printZoom}%
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">100%</span>
              <input
                type="range"
                min={100}
                max={200}
                step={5}
                value={printZoom}
                onChange={(e) => setPrintZoom(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-xs text-gray-500">200%</span>
            </div>
            {printZoom > 100 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Zoom above 100% enlarges the center of the page and crops more of the edges.
              </p>
            )}
          </div>
          )}

          {/* Browser print dialog hint */}
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            In your browser&apos;s print dialog, set Margins to <span className="font-medium">None</span> and
            Scale to <span className="font-medium">100%</span> (not &quot;fit to page&quot;).
            {fitMode !== 'auto' && ' Printing to the very edge of the paper also requires a printer with borderless support.'}
          </p>

          {/* Summary */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pages to print: {getPagesToPrint().length === 1
                ? `Page ${formatDisplayPageNumber(getPagesToPrint()[0], pageOffset)}`
                : `${getPagesToPrint().length} pages (${formatDisplayPageNumber(getPagesToPrint()[0], pageOffset)} - ${formatDisplayPageNumber(getPagesToPrint()[getPagesToPrint().length - 1], pageOffset)})`
              }
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Paper: {paperSizes[paperSize].label},{' '}
              {fitMode === 'auto'
                ? `even ${marginOptions.find(o => o.value === printMargin)?.label.toLowerCase()} margins`
                : fitMode === 'fill' ? 'fill page' : 'fit page'}
              {fitMode !== 'auto' && printZoom > 100 && ` at ${printZoom}% zoom`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            disabled={isPrinting || getPagesToPrint().length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {isPrinting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Preparing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
