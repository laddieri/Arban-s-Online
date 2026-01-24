'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  pdfUrl: string;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export default function PDFViewer({ pdfUrl, currentPage, onPageChange }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState<number>(800);

  useEffect(() => {
    const updateWidth = () => {
      const container = document.getElementById('pdf-container');
      if (container) {
        setPageWidth(container.offsetWidth - 40);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < numPages) {
      onPageChange(currentPage + 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= numPages) {
      onPageChange(page);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800" id="pdf-container">
        <div className="flex justify-center p-4">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-96">
                <div className="text-lg">Loading PDF...</div>
              </div>
            }
            error={
              <div className="flex items-center justify-center h-96">
                <div className="text-lg text-red-600">
                  Error loading PDF. Please make sure the PDF file is placed in the /public folder.
                </div>
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              width={pageWidth}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-300 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition"
          >
            Previous
          </button>

          <div className="flex items-center gap-4">
            <span className="text-sm">
              Page{' '}
              <input
                type="number"
                min={1}
                max={numPages}
                value={currentPage}
                onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-800"
              />
              {' '}of {numPages}
            </span>
          </div>

          <button
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
