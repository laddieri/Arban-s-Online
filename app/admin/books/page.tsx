'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Book } from '@/config/books';
import type { Section } from '@/config/tocSections';
import { loadRemoteBooks } from '@/lib/books/registry';
import {
  validateBookPayload,
  slugFromTitle,
  BOOK_ID_PATTERN,
} from '@/utils/bookValidation';
import { loadPdf, renderPageToBlob, detectWebpEncodeSupport } from '@/lib/pdfConvert';

// How many page images upload in parallel. R2 handles far more, but the
// browser tab is also rendering pages; 3 keeps memory flat on big books.
const UPLOAD_CONCURRENCY = 3;
const UPLOAD_RETRIES = 3;

interface TocRow {
  title: string;
  page: string; // kept as text while editing; validated on submit
}

type Phase =
  | { name: 'idle' }
  | { name: 'reading' }
  | { name: 'uploading'; done: number; total: number }
  | { name: 'registering' }
  | { name: 'done'; bookId: string };

function sectionsToRows(sections: Section[]): TocRow[] {
  const rows: TocRow[] = [];
  for (const s of sections) {
    rows.push({ title: s.title, page: String(s.page) });
    for (const sub of s.subsections ?? []) {
      rows.push({ title: sub.title, page: String(sub.page) });
    }
  }
  return rows;
}

function rowsToSections(rows: TocRow[]): Section[] {
  return rows
    .filter(r => r.title.trim() !== '' || r.page.trim() !== '')
    .map(r => ({ title: r.title.trim(), page: parseInt(r.page, 10) }));
}

export default function AdminBooksPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [runtimeBooks, setRuntimeBooks] = useState<Book[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form state (shared by create and edit modes)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [shortTitle, setShortTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [pageOffset, setPageOffset] = useState('-1');
  const [minExercisePage, setMinExercisePage] = useState('1');
  const [tocRows, setTocRows] = useState<TocRow[]>([]);
  const [phase, setPhase] = useState<Phase>({ name: 'idle' });

  const busy = phase.name !== 'idle' && phase.name !== 'done';

  const fetchBooks = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/books');
      if (res.status === 401 || res.status === 403 || res.status === 503) {
        setIsAdmin(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load books');
      setIsAdmin(true);
      setRuntimeBooks(data.books ?? []);
    } catch (err: any) {
      setIsAdmin(true); // network hiccup, not a permissions verdict
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const resetForm = () => {
    setEditingId(null);
    setPdfFile(null);
    setTitle('');
    setShortTitle('');
    setSlug('');
    setSlugTouched(false);
    setPageOffset('-1');
    setMinExercisePage('1');
    setTocRows([]);
    setPhase({ name: 'idle' });
    setError(null);
  };

  const startEdit = (book: Book) => {
    setEditingId(book.id);
    setPdfFile(null);
    setTitle(book.title);
    setShortTitle(book.shortTitle);
    setSlug(book.id);
    setPageOffset(String(book.pageOffset));
    setMinExercisePage(String(book.minExercisePage));
    setTocRows(sectionsToRows(book.sections));
    setPhase({ name: 'idle' });
    setError(null);
    window.scrollTo({ top: 0 });
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched && !editingId) setSlug(slugFromTitle(value));
  };

  const uploadAllPages = async (
    doc: Awaited<ReturnType<typeof loadPdf>>,
    bookId: string,
    format: 'webp' | 'png'
  ) => {
    const total = doc.numPages;
    let done = 0;
    let nextPage = 1;
    setPhase({ name: 'uploading', done: 0, total });

    const uploadOne = async (pageNumber: number) => {
      const blob = await renderPageToBlob(doc, pageNumber, format);
      for (let attempt = 1; ; attempt++) {
        try {
          const presign = await fetch('/api/admin/books/upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId, pageIndex: pageNumber - 1, imageFormat: format }),
          });
          const presignData = await presign.json();
          if (!presign.ok) throw new Error(presignData.error || 'Failed to presign upload');
          const put = await fetch(presignData.url, {
            method: 'PUT',
            headers: { 'Content-Type': `image/${format}` },
            body: blob,
          });
          if (!put.ok) throw new Error(`Upload failed with HTTP ${put.status}`);
          return;
        } catch (err) {
          if (attempt >= UPLOAD_RETRIES) throw err;
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    };

    const worker = async () => {
      while (nextPage <= total) {
        const pageNumber = nextPage++;
        await uploadOne(pageNumber);
        done++;
        setPhase({ name: 'uploading', done, total });
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(UPLOAD_CONCURRENCY, total) }, worker)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const offsetNum = parseInt(pageOffset, 10);
    const minExNum = parseInt(minExercisePage, 10);
    const sections = rowsToSections(tocRows);
    if (sections.some(s => isNaN(s.page))) {
      setError('Every table-of-contents row needs a page number');
      return;
    }

    try {
      if (editingId) {
        // Metadata-only update
        setPhase({ name: 'registering' });
        const res = await fetch(`/api/admin/books/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            shortTitle: shortTitle.trim(),
            pageOffset: offsetNum,
            minExercisePage: minExNum,
            sections,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update book');
      } else {
        if (!pdfFile) {
          setError('Choose a PDF file');
          return;
        }
        setPhase({ name: 'reading' });
        const doc = await loadPdf(pdfFile);
        const format = detectWebpEncodeSupport() ? 'webp' : 'png';

        // Validate everything before spending minutes uploading
        const payload = {
          id: slug,
          title: title.trim(),
          shortTitle: shortTitle.trim(),
          totalPages: doc.numPages,
          pageOffset: offsetNum,
          minExercisePage: minExNum,
          imageFormat: format,
          sections,
        };
        const check = validateBookPayload(payload, ['arban', 'charlier', 'testbook']);
        if ('error' in check) {
          setPhase({ name: 'idle' });
          setError(check.error);
          return;
        }

        await uploadAllPages(doc, slug, format);
        await doc.loadingTask.destroy();

        setPhase({ name: 'registering' });
        const res = await fetch('/api/admin/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to register book');
      }

      setPhase({ name: 'done', bookId: editingId ?? slug });
      setEditingId(null);
      setPdfFile(null);
      await loadRemoteBooks(true); // refresh the client registry
      await fetchBooks();
    } catch (err: any) {
      setPhase({ name: 'idle' });
      setError(err.message || 'Something went wrong');
    }
  };

  const handleDelete = async (book: Book) => {
    if (!confirm(`Remove "${book.title}" from the site? Its images stay in the bucket.`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/books/${book.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete book');
      await loadRemoteBooks(true);
      await fetchBooks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-8 text-center">
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You need to be signed in as an admin to manage books.
          </p>
          <Link href="/" className="text-blue-600 hover:underline">
            Back to the book
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Manage Books</h1>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="text-blue-600 hover:underline">Video submissions</Link>
            <Link href="/" className="text-blue-600 hover:underline">Back to the book</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {error && (
          <div
            data-testid="books-error"
            className="p-4 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm"
          >
            {error}
          </div>
        )}

        {/* Upload / edit form */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-1 text-gray-900 dark:text-gray-100">
            {editingId ? `Edit "${editingId}"` : 'Add a book'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {editingId
              ? 'Update the metadata and table of contents. Page images are unchanged.'
              : 'Pick a public-domain PDF. Your browser converts it to page images and uploads them - keep this tab open until it finishes.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  PDF file
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  data-testid="pdf-input"
                  onChange={e => setPdfFile(e.target.files?.[0] ?? null)}
                  disabled={busy}
                  className="block w-full text-sm text-gray-700 dark:text-gray-300"
                />
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => handleTitleChange(e.target.value)}
                  required
                  maxLength={200}
                  disabled={busy}
                  placeholder="Clarke — Technical Studies for the Cornet"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Short title <span className="text-gray-400">(book switcher)</span>
                </label>
                <input
                  type="text"
                  value={shortTitle}
                  onChange={e => setShortTitle(e.target.value)}
                  required
                  maxLength={60}
                  disabled={busy}
                  placeholder="Clarke Studies"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL id
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={e => {
                    setSlug(e.target.value);
                    setSlugTouched(true);
                  }}
                  required
                  pattern={BOOK_ID_PATTERN.source}
                  disabled={busy || !!editingId}
                  placeholder="clarke"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm disabled:opacity-60"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Lowercase letters, digits, hyphens. Also the image folder in the bucket.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Page offset
                </label>
                <input
                  type="number"
                  value={pageOffset}
                  onChange={e => setPageOffset(e.target.value)}
                  required
                  min={-1}
                  max={100}
                  disabled={busy}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  -1 when printed page 1 is the first scan (cover). N&gt;0 gives N Roman-numeral
                  preface pages before page 1.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First exercise page
                </label>
                <input
                  type="number"
                  value={minExercisePage}
                  onChange={e => setMinExercisePage(e.target.value)}
                  required
                  disabled={busy}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Used by the random-exercise button.
                </p>
              </div>
            </div>

            {/* Table of contents editor */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Table of contents <span className="text-gray-400">(optional, searchable)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setTocRows(rows => [...rows, { title: '', page: '' }])}
                  disabled={busy}
                  className="text-sm text-blue-600 hover:underline"
                >
                  + Add entry
                </button>
              </div>
              {tocRows.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No entries yet. You can add them now or come back and edit later.
                </p>
              )}
              <div className="space-y-2">
                {tocRows.map((row, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={row.title}
                      onChange={e =>
                        setTocRows(rows =>
                          rows.map((r, j) => (j === i ? { ...r, title: e.target.value } : r))
                        )
                      }
                      placeholder="Study No. 1"
                      disabled={busy}
                      className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={row.page}
                      onChange={e =>
                        setTocRows(rows =>
                          rows.map((r, j) => (j === i ? { ...r, page: e.target.value } : r))
                        )
                      }
                      placeholder="Page"
                      disabled={busy}
                      className="w-20 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setTocRows(rows => rows.filter((_, j) => j !== i))}
                      disabled={busy}
                      aria-label={`Remove entry ${i + 1}`}
                      className="px-2 text-gray-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress / actions */}
            {phase.name === 'uploading' && (
              <div data-testid="upload-progress">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span>Uploading pages…</span>
                  <span>
                    {phase.done} / {phase.total}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${(phase.done / phase.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            {phase.name === 'reading' && (
              <p className="text-sm text-gray-600 dark:text-gray-400">Reading PDF…</p>
            )}
            {phase.name === 'registering' && (
              <p className="text-sm text-gray-600 dark:text-gray-400">Saving book…</p>
            )}
            {phase.name === 'done' && (
              <p data-testid="upload-done" className="text-sm text-green-700 dark:text-green-400">
                Saved. <Link href={`/?book=${phase.bookId}`} className="underline">Open it</Link> in
                the viewer.
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition text-sm font-medium"
              >
                {editingId ? 'Save changes' : 'Convert & upload'}
              </button>
              {(editingId || phase.name === 'done') && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={busy}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm"
                >
                  {editingId ? 'Cancel' : 'Add another'}
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Existing runtime books */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Uploaded books
          </h2>
          {runtimeBooks.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              None yet. Arban and Charlier are built in and don&apos;t appear here.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {runtimeBooks.map(book => (
                <li key={book.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {book.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      id: {book.id} · {book.totalPages} pages
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm shrink-0">
                    <Link href={`/?book=${book.id}`} className="text-blue-600 hover:underline">
                      View
                    </Link>
                    <button
                      onClick={() => startEdit(book)}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(book)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
