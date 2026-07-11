'use client';

import { useState, useEffect } from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import type { UserList, UserListItem } from '@/lib/supabase/types';
import { formatDisplayPageNumber } from '@/utils/pageFormat';
import { getBook, DEFAULT_BOOK_ID } from '@/lib/books/registry';
import { useBooks } from '@/hooks/useBooks';
import PrintDialog from './PrintDialog';

interface ListsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPageSelect: (page: number, bookId?: string) => void;
  pageOffset: number;
  baseUrl: string;
  imageFormat: string;
  totalPages: number;
  useImageProxy?: boolean;
}

export default function ListsPanel({
  isOpen,
  onClose,
  onPageSelect,
  pageOffset,
  baseUrl,
  imageFormat,
  totalPages,
  useImageProxy = false,
}: ListsPanelProps) {
  // Subscribe to the registry so runtime-book items re-label once loaded
  useBooks();
  const [lists, setLists] = useState<UserList[]>([]);
  const [selectedList, setSelectedList] = useState<UserList | null>(null);
  const [listItems, setListItems] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const { user } = useAuthUser();
  const [newListName, setNewListName] = useState('');
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  // Fetch lists when panel opens
  useEffect(() => {
    if (isOpen && user) {
      fetchLists();
    }
  }, [isOpen, user]);

  // Fetch items when a list is selected
  useEffect(() => {
    if (selectedList) {
      fetchListItems(selectedList.id);
    }
  }, [selectedList]);

  const fetchLists = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/lists');
      if (response.ok) {
        const data = await response.json();
        setLists(data.lists || []);
      } else {
        setError('Failed to load lists');
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
      setError('Failed to load lists');
    } finally {
      setLoading(false);
    }
  };

  const fetchListItems = async (listId: string) => {
    setItemsLoading(true);
    try {
      const response = await fetch(`/api/list-items?list_id=${listId}`);
      if (response.ok) {
        const data = await response.json();
        setListItems(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching list items:', error);
    } finally {
      setItemsLoading(false);
    }
  };

  const createList = async () => {
    if (!newListName.trim()) {
      setError('Please enter a list name');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newListName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setLists([data.list, ...lists]);
        setNewListName('');
        setShowNewListForm(false);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create list');
      }
    } catch (error) {
      console.error('Error creating list:', error);
      setError('Failed to create list');
    } finally {
      setLoading(false);
    }
  };

  const updateListName = async (listId: string, name: string) => {
    if (!name.trim()) {
      setError('List name cannot be empty');
      return;
    }

    try {
      const response = await fetch('/api/lists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list_id: listId, name: name.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setLists(lists.map(list => list.id === listId ? data.list : list));
        if (selectedList?.id === listId) {
          setSelectedList(data.list);
        }
        setEditingListId(null);
        setEditingListName('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update list');
      }
    } catch (error) {
      console.error('Error updating list:', error);
      setError('Failed to update list');
    }
  };

  const deleteList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this list? All items in it will be removed.')) {
      return;
    }

    try {
      const response = await fetch('/api/lists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list_id: listId }),
      });

      if (response.ok) {
        setLists(lists.filter(list => list.id !== listId));
        if (selectedList?.id === listId) {
          setSelectedList(null);
          setListItems([]);
        }
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      setError('Failed to delete list');
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const response = await fetch('/api/list-items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId }),
      });

      if (response.ok) {
        setListItems(listItems.filter(item => item.id !== itemId));
      }
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const handlePageClick = (pageNumber: number, bookId?: string) => {
    onPageSelect(pageNumber, bookId ?? DEFAULT_BOOK_ID);
    onClose();
  };

  const handleListClick = (list: UserList) => {
    setSelectedList(list);
    setError(null);
  };

  const handleBackToLists = () => {
    setSelectedList(null);
    setListItems([]);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {selectedList && (
              <button
                onClick={handleBackToLists}
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
            {selectedList && listItems.length > 0 && new Set(listItems.map(i => i.book_id ?? DEFAULT_BOOK_ID)).size === 1 && (
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
          {!user ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              Please sign in to view your lists.
            </div>
          ) : selectedList ? (
            // Show items in selected list
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded">
                  {error}
                </div>
              )}
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
                  {listItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                    >
                      <button
                        onClick={() => handlePageClick(item.page_number, item.book_id)}
                        className="flex-1 text-left"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {item.title || `${getBook(item.book_id).shortTitle} - Page ${formatDisplayPageNumber(item.page_number, getBook(item.book_id).pageOffset)}`}
                        </div>
                        {!item.title && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Page {formatDisplayPageNumber(item.page_number, getBook(item.book_id).pageOffset)}
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
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition"
                        title="Remove from list"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Show all lists
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded">
                  {error}
                </div>
              )}

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
                        createList();
                      } else if (e.key === 'Escape') {
                        setShowNewListForm(false);
                        setNewListName('');
                        setError(null);
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={createList}
                      disabled={loading || !newListName.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating...' : 'Create List'}
                    </button>
                    <button
                      onClick={() => {
                        setShowNewListForm(false);
                        setNewListName('');
                        setError(null);
                      }}
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
                    <div
                      key={list.id}
                      className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                    >
                      {editingListId === list.id ? (
                        <>
                          <input
                            type="text"
                            value={editingListName}
                            onChange={(e) => setEditingListName(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            maxLength={100}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateListName(list.id, editingListName);
                              } else if (e.key === 'Escape') {
                                setEditingListId(null);
                                setEditingListName('');
                              }
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => updateListName(list.id, editingListName)}
                            className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                            title="Save"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setEditingListId(null);
                              setEditingListName('');
                            }}
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
                            onClick={() => handleListClick(list)}
                            className="flex-1 text-left font-medium text-gray-900 dark:text-gray-100"
                          >
                            {list.name}
                          </button>
                          <button
                            onClick={() => {
                              setEditingListId(list.id);
                              setEditingListName(list.name);
                            }}
                            className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Rename list"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteList(list.id)}
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
      {selectedList && (
        <PrintDialog
          isOpen={isPrintDialogOpen}
          onClose={() => setIsPrintDialogOpen(false)}
          bookId={listItems[0]?.book_id ?? DEFAULT_BOOK_ID}
          currentPage={listItems.length > 0 ? listItems[0].page_number : 1}
          totalPages={listItems.length > 0 ? getBook(listItems[0].book_id).totalPages : totalPages}
          baseUrl={baseUrl}
          imageFormat={imageFormat}
          pageOffset={listItems.length > 0 ? getBook(listItems[0].book_id).pageOffset : pageOffset}
          useImageProxy={useImageProxy}
          initialPages={listItems.map(item => item.page_number)}
        />
      )}
    </div>
  );
}
