'use client';

import { useState, useEffect } from 'react';

interface PrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
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
  const [selectedPages, setSelectedPages] = useState<number[]>([currentPage]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printScale, setPrintScale] = useState<'letter' | 'legal' | 'tabloid' | 'a3'>('letter');
  const [printZoom, setPrintZoom] = useState(100);

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
    }
  }, [isOpen, currentPage, initialPages]);

  // Format page number with leading zeros
  const formatPageNumber = (num: number) => {
    return num.toString().padStart(3, '0');
  };

  // Get image URL for a page (apply offset to convert display page number to image file number)
  // When useImageProxy is true, route through /api/image/[page] to avoid firewall blocks
  const getImageUrl = (pageNum: number) => {
    const imagePageNum = pageNum + pageOffset;
    const paddedNum = formatPageNumber(imagePageNum);
    if (useImageProxy) {
      return `/api/image/${paddedNum}`;
    }
    return `${baseUrl}/page-${paddedNum}.${imageFormat}`;
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

  // Handle print
  const handlePrint = async () => {
    const pages = getPagesToPrint();
    if (pages.length === 0) return;

    setIsPrinting(true);

    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print pages.');
        setIsPrinting(false);
        return;
      }

      const paper = paperSizes[printScale];

      // Build HTML content with images
      const imagesHtml = pages
        .map(
          (page) => `
          <div class="page">
            <img src="${getImageUrl(page)}" alt="Page ${page}" />
          </div>
        `
        )
        .join('');

      printWindow.document.write(`
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
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              body {
                background: white;
              }

              .page {
                page-break-after: always;
                page-break-inside: avoid;
                width: calc(${paper.width} - 0.25in);
                height: calc(${paper.height} - 0.25in);
                margin: 0.125in auto;
                display: flex;
                align-items: center;
                justify-content: center;
                background: white;
                overflow: hidden;
              }

              .page:last-child {
                page-break-after: auto;
              }

              .page img {
                display: block;
                width: 100%;
                height: 100%;
                object-fit: contain;
                transform: scale(${printZoom / 100});
                transform-origin: center center;
              }

              @media print {
                @page {
                  size: ${paper.width} ${paper.height} portrait;
                  margin: 0.125in;
                }

                .page {
                  width: calc(${paper.width} - 0.25in);
                  height: calc(${paper.height} - 0.25in);
                  margin: 0 auto;
                }
              }
            </style>
          </head>
          <body>
            ${imagesHtml}
            <script>
              // Wait for all images to load before printing
              const images = document.querySelectorAll('img');
              let loadedCount = 0;
              const totalImages = images.length;

              function checkAllLoaded() {
                loadedCount++;
                if (loadedCount >= totalImages) {
                  setTimeout(() => {
                    window.print();
                    window.close();
                  }, 100);
                }
              }

              images.forEach(img => {
                if (img.complete) {
                  checkAllLoaded();
                } else {
                  img.onload = checkAllLoaded;
                  img.onerror = checkAllLoaded;
                }
              });

              // Fallback if images don't trigger load events
              setTimeout(() => {
                if (loadedCount < totalImages) {
                  window.print();
                  window.close();
                }
              }, 5000);
            </script>
          </body>
        </html>
      `);

      printWindow.document.close();
      onClose();
    } catch (error) {
      console.error('Print error:', error);
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
                Current page ({currentPage})
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
                      type="number"
                      min={0}
                      max={totalPages}
                      value={startPage}
                      onChange={(e) => setStartPage(Math.max(0, Math.min(totalPages, parseInt(e.target.value) || 0)))}
                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="number"
                      min={0}
                      max={totalPages}
                      value={endPage}
                      onChange={(e) => setEndPage(Math.max(0, Math.min(totalPages, parseInt(e.target.value) || 0)))}
                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700"
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
                {Array.from({ length: totalPages + 1 }, (_, i) => i).map((page) => (
                  <button
                    key={page}
                    onClick={() => togglePageSelection(page)}
                    className={`p-1 text-xs rounded ${
                      selectedPages.includes(page)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {page}
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
            <div className="space-y-2">
              {Object.entries(paperSizes).map(([key, size]) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paperSize"
                    value={key}
                    checked={printScale === key}
                    onChange={() => setPrintScale(key as 'letter' | 'legal' | 'tabloid' | 'a3')}
                    className="w-4 h-4 text-blue-600 mt-0.5"
                  />
                  <div>
                    <span className="text-gray-700 dark:text-gray-300 text-sm">{size.label}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">({size.width} x {size.height})</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{size.description}</p>
                  </div>
                </label>
              ))}
            </div>
            {printScale !== 'letter' && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Make sure your printer has the selected paper size loaded, or select &quot;Fit to page&quot; in your browser&apos;s print dialog.
              </p>
            )}
          </div>

          {/* Print zoom */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Print Zoom: {printZoom}%
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
                Zoom above 100% will enlarge the center of the page and crop the edges.
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pages to print: {getPagesToPrint().length === 1
                ? `Page ${getPagesToPrint()[0]}`
                : `${getPagesToPrint().length} pages (${getPagesToPrint()[0]} - ${getPagesToPrint()[getPagesToPrint().length - 1]})`
              }
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Paper: {paperSizes[printScale].label}
              {printZoom > 100 && ` at ${printZoom}% zoom`}
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
