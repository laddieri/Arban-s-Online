'use client';

import { useState } from 'react';
import type { UserList, UserListItem } from '@/lib/supabase/types';
import { formatDisplayPageNumber } from '@/utils/pageFormat';
import { getBook, DEFAULT_BOOK_ID } from '@/lib/books/registry';
import { bookImageBaseUrl } from '@/config/books';
import { useBooks } from '@/hooks/useBooks';
import { useLists } from '@/hooks/useLists';
import PrintDialog from './PrintDialog';

interface ListsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPageSelect: (page: number, bookId?: string) => void;
  /** Start practicing a list: the viewer shows a bar to move through it */
  onStartPractice?: (session: {
    name: string;
    items: { book: string; page: number; title: string | null }[];
    index: number;
  }) => void;
  /** Fallback when a book doesn't set its own image format */
  imageFormat: string;
  useImageProxy?: boolean;
}

const errorClass =
  'mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded';

export default function ListsPanel({
  isOpen,
  onClose,
  onPageSelect,
  onStartPractice,
  imageFormat,
  useImageProxy = false,
}: ListsPanelProps) {
  // Subscribe to the registry so runtime-book items re-label once loaded
  useBooks();
  const {
    user,
    lists,
    selectedList,
    listItems,
    loading,
    itemsLoading,
    authRequired,
    error,
    setError,
    selectList,
    createList,
    renameList,
    deleteList,
    removeItem,
    moveItem,
  } = useLists(isOpen);
  const [newListName, setNewListName] = useState('');
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  const closeNewListForm = () => {
    setShowNewListForm(false);
    setNewListName('');
    setError(null);
  };

  const handleCreateList = async () => {
    if (await createList(newListName)) {
      setNewListName('');
      setShowNewListForm(false);
    }
  };

  const practiceItems = () =>
    listItems.map(item => ({
      book: item.book_id ?? DEFAULT_BOOK_ID,
      page: item.page_number,
      title: item.title ?? null,
    }));

  // Opening an item from a list starts practicing that list at the item;
  // the viewer's practice bar then steps through the rest
  const handleItemClick = (index: number) => {
    if (onStartPractice && selectedList) {
      onStartPractice({ name: selectedList.name, items: practiceItems(), index });
    } else {
      const item = listItems[index];
      onPageSelect(item.page_number, item.book_id ?? DEFAULT_BOOK_ID);
    }
    onClose();
  };

  const handlePracticeAll = () => {
    if (onStartPractice && selectedList && listItems.length > 0) {
      onStartPractice({ name: selectedList.name, items: practiceItems(), index: 0 });
      onClose();
    }
  };

  // Printing covers one book at a time; its images come from that book's
  // own folder and format, whatever book the viewer currently shows
  const listBookIds = new Set(listItems.map(i => i.book_id ?? DEFAULT_BOOK_ID));
  const printBook = listBookIds.size === 1 ? getBook([...listBookIds][0]) : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {selectedList && (
              <button
                onClick={() => selectList(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Back to lists"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {selectedList ? selectedList.name : 'My Lists'}
            </h2>
            {selectedList && listItems.length > 0 && onStartPractice && (
              <button
                onClick={handlePracticeAll}
                className="ml-2 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition flex items-center gap-1.5"
                title="Practice this list from the first exercise"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Practice
              </button>
            )}
            {selectedList && printBook && (
              <button
                onClick={() => setIsPrintDialogOpen(true)}
                className="ml-2 p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="Print pages from this list"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {authRequired ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              Please sign in to view your lists.
            </div>
          ) : selectedList ? (
            // Show items in selected list
            <>
              {error && <div className={errorClass}>{error}</div>}
              {itemsLoading ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  Loading items...
                </div>
              ) : listItems.length === 0 ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  <p className="mb-2">This list is empty.</p>
                  <p className="text-sm">
                    Use the &quot;Add to List&quot; button while viewing a page to add it to this list.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {listItems.map((item, index) => (
                    <ListItemRow
                      key={item.id}
                      item={item}
                      isFirst={index === 0}
                      isLast={index === listItems.length - 1}
                      onOpen={() => handleItemClick(index)}
                      onMove={direction => moveItem(index, direction)}
                      onRemove={() => removeItem(item.id)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            // Show all lists
            <>
              {error && <div className={errorClass}>{error}</div>}

              {/* New List Form */}
              {showNewListForm && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New List Name
                  </label>
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="e.g., Best Tonguing Exercises"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                    disabled={loading}
                    maxLength={100}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateList();
                      } else if (e.key === 'Escape') {
                        closeNewListForm();
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateList}
                      disabled={loading || !newListName.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating...' : 'Create List'}
                    </button>
                    <button
                      onClick={closeNewListForm}
                      disabled={loading}
                      className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {!showNewListForm && (
                <button
                  onClick={() => setShowNewListForm(true)}
                  className="mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                >
                  + Create New List
                </button>
              )}

              {loading ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  Loading lists...
                </div>
              ) : lists.length === 0 ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <p className="mb-2">You don&apos;t have any lists yet.</p>
                  <p className="text-sm">
                    Create a list to organize your favorite pages.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lists.map((list) => (
                    <ListRow
                      key={list.id}
                      list={list}
                      onOpen={() => selectList(list)}
                      onRename={name => renameList(list.id, name)}
                      onDelete={() => deleteList(list.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {user && !selectedList && lists.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-600 dark:text-gray-400">
            {lists.length} list{lists.length !== 1 ? 's' : ''}
          </div>
        )}
        {user && selectedList && listItems.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-600 dark:text-gray-400">
            {listItems.length} item{listItems.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Print Dialog */}
      {selectedList && printBook && (
        <PrintDialog
          isOpen={isPrintDialogOpen}
          onClose={() => setIsPrintDialogOpen(false)}
          bookId={printBook.id}
          currentPage={listItems[0].page_number}
          totalPages={printBook.totalPages}
          baseUrl={bookImageBaseUrl(printBook)}
          imageFormat={printBook.imageFormat ?? imageFormat}
          pageOffset={printBook.pageOffset}
          useImageProxy={useImageProxy}
          initialPages={listItems.map(item => item.page_number)}
        />
      )}
    </div>
  );
}

/** One list in the overview, renamable in place */
function ListRow({
  list,
  onOpen,
  onRename,
  onDelete,
}: {
  list: UserList;
  onOpen: () => void;
  /** Resolves true when the rename was saved */
  onRename: (name: string) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [editingName, setEditingName] = useState<string | null>(null);

  const save = async () => {
    if (editingName !== null && (await onRename(editingName))) setEditingName(null);
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition">
      {editingName !== null ? (
        <>
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            maxLength={100}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                save();
              } else if (e.key === 'Escape') {
                setEditingName(null);
              }
            }}
            autoFocus
          />
          <button
            onClick={save}
            className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
            title="Save"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={() => setEditingName(null)}
            className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
            title="Cancel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onOpen}
            className="flex-1 text-left font-medium text-gray-900 dark:text-gray-100"
          >
            {list.name}
          </button>
          <button
            onClick={() => setEditingName(list.name)}
            className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            title="Rename list"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            title="Delete list"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

/** One exercise in a list: open it, reorder it, or remove it */
function ListItemRow({
  item,
  isFirst,
  isLast,
  onOpen,
  onMove,
  onRemove,
}: {
  item: UserListItem;
  isFirst: boolean;
  isLast: boolean;
  onOpen: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const book = getBook(item.book_id);
  const displayPage = formatDisplayPageNumber(item.page_number, book.pageOffset);

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition">
      <button onClick={onOpen} className="flex-1 text-left">
        <div className="font-medium text-gray-900 dark:text-gray-100">
          {item.title || `${book.shortTitle} - Page ${displayPage}`}
        </div>
        {!item.title && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Page {displayPage}
          </div>
        )}
        {item.description && (
          <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {item.description}
          </div>
        )}
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Added {new Date(item.created_at).toLocaleDateString()}
        </div>
      </button>
      <div className="flex flex-col shrink-0">
        <button
          onClick={() => onMove(-1)}
          disabled={isFirst}
          aria-label="Move up"
          className="px-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          onClick={() => onMove(1)}
          disabled={isLast}
          aria-label="Move down"
          className="px-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      <button
        onClick={onRemove}
        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition"
        title="Remove from list"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
