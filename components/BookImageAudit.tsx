'use client';

import { useState } from 'react';
import { useBooks } from '@/hooks/useBooks';
import { auditBookImages, AuditResult, AuditController } from '@/lib/imageAudit';
import { errorMessage } from '@/utils/errors';

interface BookImageAuditProps {
  onError: (message: string | null) => void;
}

/**
 * Admin page-image verifier: checks every page image of a book (compiled-in
 * ones included) loads and isn't blank.
 */
export default function BookImageAudit({ onError }: BookImageAuditProps) {
  const { books } = useBooks();
  const [bookId, setBookId] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [controller, setController] = useState<AuditController | null>(null);

  const runAudit = async () => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    onError(null);
    setResult(null);
    const ctrl: AuditController = { cancelled: false };
    setController(ctrl);
    setProgress({ done: 0, total: 0 });
    try {
      const audit = await auditBookImages(book, setProgress, ctrl);
      if (!ctrl.cancelled) setResult(audit);
    } catch (err) {
      onError(errorMessage(err, 'Image check failed'));
    } finally {
      setProgress(null);
      setController(null);
    }
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-1 text-gray-900 dark:text-gray-100">
        Check a book&apos;s pages
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Confirms every page image loads and isn&apos;t blank. Run it after uploading a
        book, or if readers report empty pages.
      </p>
      <div className="flex gap-2 items-center flex-wrap">
        <select
          value={bookId}
          onChange={e => setBookId(e.target.value)}
          disabled={progress !== null}
          aria-label="Book to check"
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="">Choose a book…</option>
          {books.map(b => (
            <option key={b.id} value={b.id}>
              {b.shortTitle}
            </option>
          ))}
        </select>
        <button
          onClick={runAudit}
          disabled={!bookId || progress !== null}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition text-sm font-medium"
        >
          Check pages
        </button>
        {progress && (
          <>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {progress.done} / {progress.total}
            </span>
            <button
              onClick={() => {
                if (controller) controller.cancelled = true;
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Cancel
            </button>
          </>
        )}
      </div>
      {result && (
        <div className="mt-4 text-sm" data-testid="audit-result">
          {result.missing.length === 0 && result.blank.length === 0 ? (
            <p className="text-green-700 dark:text-green-400">
              All {result.checked} page images load correctly.
            </p>
          ) : (
            <div className="space-y-1 text-gray-800 dark:text-gray-200">
              <p>Checked {result.checked} page images:</p>
              {result.missing.length > 0 && (
                <p className="text-red-700 dark:text-red-400">
                  Missing ({result.missing.length}): pages{' '}
                  {result.missing.join(', ')}
                </p>
              )}
              {result.blank.length > 0 && (
                <p className="text-amber-700 dark:text-amber-400">
                  Blank ({result.blank.length}): pages {result.blank.join(', ')}
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    Some scans genuinely have blank pages - compare with the
                    PDF before treating these as problems.
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
