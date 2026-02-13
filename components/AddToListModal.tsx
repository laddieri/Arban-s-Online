'use client';

import { useState, useEffect } from 'react';
import type { UserList } from '@/lib/supabase/types';

interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageNumber: number;
  onSuccess?: () => void;
}

export default function AddToListModal({ isOpen, onClose, pageNumber, onSuccess }: AddToListModalProps) {
  const [lists, setLists] = useState<UserList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newListName, setNewListName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's lists when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLists();
      // Reset form
      setSelectedListId('');
      setTitle('');
      setDescription('');
      setNewListName('');
      setShowNewListForm(false);
      setError(null);
    }
  }, [isOpen]);

  const fetchLists = async () => {
    try {
      const response = await fetch('/api/lists');
      if (response.ok) {
        const data = await response.json();
        setLists(data.lists);
        // Auto-select first list if available
        if (data.lists.length > 0) {
          setSelectedListId(data.lists[0].id);
        }
      } else {
        console.error('Failed to fetch lists');
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
    }
  };

  const handleCreateList = async () => {
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
        // Add new list to the list and select it
        setLists([data.list, ...lists]);
        setSelectedListId(data.list.id);
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

  const handleAddToList = async () => {
    if (!selectedListId) {
      setError('Please select a list');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/list-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list_id: selectedListId,
          page_number: pageNumber,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });

      if (response.ok) {
        onSuccess?.();
        onClose();
      } else {
        const data = await response.json();
        if (response.status === 409) {
          setError('This page is already in the selected list');
        } else {
          setError(data.error || 'Failed to add page to list');
        }
      }
    } catch (error) {
      console.error('Error adding to list:', error);
      setError('Failed to add page to list');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Add Page {pageNumber} to List
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded">
              {error}
            </div>
          )}

          {/* List Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select List
            </label>
            {lists.length > 0 ? (
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading || showNewListForm}
              >
                <option value="">-- Select a list --</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                You don&apos;t have any lists yet. Create one below!
              </p>
            )}
          </div>

          {/* New List Form */}
          {showNewListForm ? (
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
          ) : (
            <button
              onClick={() => setShowNewListForm(true)}
              className="mb-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              disabled={loading}
            >
              + Create New List
            </button>
          )}

          {/* Title Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Double Tonguing Exercise"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
              maxLength={200}
            />
          </div>

          {/* Description Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this page..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={loading}
              maxLength={1000}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleAddToList}
              disabled={loading || !selectedListId || showNewListForm}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Adding...' : 'Add to List'}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg font-medium transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
