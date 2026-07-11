'use client';

import { useState } from 'react';
import type { Section } from '@/config/tocSections';
import { getBook, loadRemoteBooks } from '@/lib/books/registry';
import { formatDisplayPageNumber } from '@/utils/pageFormat';

interface AddTocEntryModalProps {
  bookId: string;
  page: number;
  pageOffset: number;
  onClose: () => void;
}

/**
 * Admin-only: add the currently open page to a runtime book's table of
 * contents without leaving the viewer. The entry is inserted in page order
 * and the sidebar TOC refreshes immediately.
 */
export default function AddTocEntryModal({
  bookId,
  page,
  pageOffset,
  onClose,
}: AddTocEntryModalProps) {
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const book = getBook(bookId);
      const sections: Section[] = [...book.sections, { title: title.trim(), page }].sort(
        (a, b) => a.page - b.page
      );
      const res = await fetch(`/api/admin/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save the entry');
      await loadRemoteBooks(true); // sidebar TOC picks the new entry up
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save the entry');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-gray-100">
          Add to table of contents
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Creates an entry for page {formatDisplayPageNumber(page, pageOffset)} of{' '}
          {getBook(bookId).shortTitle}. It becomes searchable right away.
        </p>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              maxLength={200}
              autoFocus
              placeholder="Study No. 5"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSaving || title.trim().length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
