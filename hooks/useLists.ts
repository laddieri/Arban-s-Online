'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthUser } from './useAuthUser';
import type { UserList, UserListItem } from '@/lib/supabase/types';

/**
 * The signed-in user's practice lists and the items of the selected one,
 * with the API calls that change them. Lists load while `active` (the
 * panel is open) and reload after sign-in.
 */
export function useLists(active: boolean) {
  const { user } = useAuthUser();
  const [lists, setLists] = useState<UserList[]>([]);
  const [selectedList, setSelectedList] = useState<UserList | null>(null);
  const [listItems, setListItems] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/lists');
      if (response.ok) {
        const data = await response.json();
        setLists(data.lists || []);
        setAuthRequired(false);
      } else if (response.status === 401 || response.status === 503) {
        setAuthRequired(true);
      } else {
        setError('Failed to load lists');
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
      setError('Failed to load lists');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) fetchLists();
  }, [active, user, fetchLists]);

  useEffect(() => {
    if (!selectedList) return;
    const listId = selectedList.id;
    (async () => {
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
    })();
  }, [selectedList]);

  /** Open a list (null goes back to the overview) */
  const selectList = (list: UserList | null) => {
    setSelectedList(list);
    if (!list) setListItems([]);
    setError(null);
  };

  /** Resolves true when the list was created */
  const createList = async (name: string): Promise<boolean> => {
    if (!name.trim()) {
      setError('Please enter a list name');
      return false;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to create list');
        return false;
      }
      setLists(prev => [data.list, ...prev]);
      return true;
    } catch (error) {
      console.error('Error creating list:', error);
      setError('Failed to create list');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /** Resolves true when the list was renamed */
  const renameList = async (listId: string, name: string): Promise<boolean> => {
    if (!name.trim()) {
      setError('List name cannot be empty');
      return false;
    }

    try {
      const response = await fetch('/api/lists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list_id: listId, name: name.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to update list');
        return false;
      }
      setLists(prev => prev.map(list => (list.id === listId ? data.list : list)));
      if (selectedList?.id === listId) setSelectedList(data.list);
      return true;
    } catch (error) {
      console.error('Error updating list:', error);
      setError('Failed to update list');
      return false;
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
        setLists(prev => prev.filter(list => list.id !== listId));
        if (selectedList?.id === listId) selectList(null);
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
        setListItems(prev => prev.filter(item => item.id !== itemId));
      }
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  // Swap an item with its neighbor, optimistically, then persist the order
  const moveItem = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (!selectedList || target < 0 || target >= listItems.length) return;
    const previous = listItems;
    const next = [...listItems];
    [next[index], next[target]] = [next[target], next[index]];
    setListItems(next);
    try {
      const response = await fetch('/api/list-items/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list_id: selectedList.id,
          item_ids: next.map(item => item.id),
        }),
      });
      if (!response.ok) throw new Error();
    } catch {
      setListItems(previous); // roll back; the server order stands
      setError('Failed to save the new order');
    }
  };

  return {
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
  };
}
