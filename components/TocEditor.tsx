'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { Section } from '@/config/tocSections';

export interface TocRow {
  title: string;
  page: string; // kept as text while editing; validated on submit
  /** Snapshot of the scanned page strip a suggestion came from (not saved) */
  preview?: string;
}

export function sectionsToRows(sections: Section[]): TocRow[] {
  const rows: TocRow[] = [];
  for (const s of sections) {
    rows.push({ title: s.title, page: String(s.page) });
    for (const sub of s.subsections ?? []) {
      rows.push({ title: sub.title, page: String(sub.page) });
    }
  }
  return rows;
}

/** Blank rows are dropped; a row with a title but no page yields NaN */
export function rowsToSections(rows: TocRow[]): Section[] {
  return rows
    .filter(r => r.title.trim() !== '' || r.page.trim() !== '')
    .map(r => ({ title: r.title.trim(), page: parseInt(r.page, 10) }));
}

interface TocEditorProps {
  rows: TocRow[];
  setRows: Dispatch<SetStateAction<TocRow[]>>;
  busy: boolean;
  /** Progress of a running "Suggest from pages" scan, else null */
  scan: { done: number; total: number } | null;
  onSuggest: () => void;
  onCancelScan: () => void;
}

/** Admin editor for a book's table of contents (title + page rows) */
export default function TocEditor({ rows, setRows, busy, scan, onSuggest, onCancelScan }: TocEditorProps) {
  const updateRow = (i: number, patch: Partial<TocRow>) =>
    setRows(all => all.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Table of contents <span className="text-gray-400">(optional, searchable)</span>
        </label>
        <div className="flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onSuggest}
            disabled={busy}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
            title="Read the titles off the pages (PDF text or OCR) and pre-fill the entries"
          >
            ✨ Suggest from pages
          </button>
          <button
            type="button"
            onClick={() => setRows(all => [...all, { title: '', page: '' }])}
            disabled={busy}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            + Add entry
          </button>
        </div>
      </div>

      {scan && (
        <div
          data-testid="scan-progress"
          className="mb-2 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400"
        >
          <span className="shrink-0">
            Scanning pages… {scan.total > 0 ? `${scan.done} / ${scan.total}` : ''}
          </span>
          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: scan.total ? `${(scan.done / scan.total) * 100}%` : '0%' }}
            />
          </div>
          <button
            type="button"
            onClick={onCancelScan}
            className="text-red-600 hover:underline shrink-0"
          >
            Cancel
          </button>
        </div>
      )}
      {rows.length === 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          No entries yet. You can add them now or come back and edit later.
        </p>
      )}
      <div className="space-y-2" data-testid="toc-rows">
        {rows.map((row, i) => (
          <div key={i}>
            {row.preview && (
              // The scanned strip the suggestion was read from, so
              // titles can be verified without opening the book
              <img
                src={row.preview}
                alt=""
                className="w-full max-w-md rounded border border-gray-200 dark:border-gray-700 mb-1"
              />
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={row.title}
                onChange={e => updateRow(i, { title: e.target.value })}
                placeholder="Study No. 1"
                disabled={busy}
                className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              />
              <input
                type="text"
                inputMode="numeric"
                value={row.page}
                onChange={e => updateRow(i, { page: e.target.value })}
                placeholder="Page"
                disabled={busy}
                className="w-20 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              />
              <button
                type="button"
                onClick={() => setRows(all => all.filter((_, j) => j !== i))}
                disabled={busy}
                aria-label={`Remove entry ${i + 1}`}
                className="px-2 text-gray-400 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
