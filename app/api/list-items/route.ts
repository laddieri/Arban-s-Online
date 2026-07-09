import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/api';
import { isValidBookId, DEFAULT_BOOK_ID } from '@/config/books';
import type { UserListItem, UserListItemInsert } from '@/lib/supabase/types';

// GET /api/list-items - Get all items for a specific list or all items for user
export async function GET(request: Request) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { supabase, user } = auth;

  // Get list_id from query params
  const { searchParams } = new URL(request.url);
  const listId = searchParams.get('list_id');
  const pageNumber = searchParams.get('page_number');

  // Build query
  let query = supabase
    .from('user_list_items')
    .select(`
      *,
      user_lists!inner(user_id)
    `)
    .eq('user_lists.user_id', user.id);

  // Filter by list_id if provided
  if (listId) {
    query = query.eq('list_id', listId);
  }

  // Filter by page_number if provided (to check if page is in any list)
  if (pageNumber) {
    const pageNum = parseInt(pageNumber, 10);
    if (!isNaN(pageNum)) {
      query = query.eq('page_number', pageNum);
    }
  }

  query = query.order('created_at', { ascending: false });

  const { data: items, error } = await query;

  if (error) {
    console.error('Error fetching list items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch list items' },
      { status: 500 }
    );
  }

  // Remove the nested user_lists data from response
  const cleanedItems = items.map(item => {
    const { user_lists, ...rest } = item as any;
    return rest;
  });

  return NextResponse.json({ items: cleanedItems as UserListItem[] });
}

// POST /api/list-items - Add a page to a list
export async function POST(request: Request) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { supabase, user } = auth;

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { list_id, page_number, title, description } = body;

  const bookId = body.book_id ?? DEFAULT_BOOK_ID;
  if (typeof bookId !== 'string' || !isValidBookId(bookId)) {
    return NextResponse.json({ error: 'Unknown book' }, { status: 400 });
  }

  // Validate required fields
  if (!list_id || typeof list_id !== 'string') {
    return NextResponse.json(
      { error: 'List ID is required' },
      { status: 400 }
    );
  }

  if (typeof page_number !== 'number') {
    return NextResponse.json(
      { error: 'Page number is required and must be a number' },
      { status: 400 }
    );
  }

  // Validate optional fields
  if (title !== undefined && (typeof title !== 'string' || title.length > 200)) {
    return NextResponse.json(
      { error: 'Title must be a string with maximum 200 characters' },
      { status: 400 }
    );
  }

  if (description !== undefined && (typeof description !== 'string' || description.length > 1000)) {
    return NextResponse.json(
      { error: 'Description must be a string with maximum 1000 characters' },
      { status: 400 }
    );
  }

  // Verify the list belongs to the user
  const { data: list, error: listError } = await supabase
    .from('user_lists')
    .select('id')
    .eq('id', list_id)
    .eq('user_id', user.id)
    .single();

  if (listError || !list) {
    return NextResponse.json(
      { error: 'List not found or access denied' },
      { status: 404 }
    );
  }

  // Create the list item
  const newItem: UserListItemInsert = {
    list_id,
    page_number,
    book_id: bookId,
    title: title?.trim() || undefined,
    description: description?.trim() || undefined,
  };

  const { data: item, error } = await supabase
    .from('user_list_items')
    .insert(newItem)
    .select()
    .single();

  if (error) {
    // Check for duplicate (unique constraint violation)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Page already exists in this list' },
        { status: 409 }
      );
    }

    console.error('Error creating list item:', error);
    return NextResponse.json(
      { error: 'Failed to add page to list' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: 'Page added to list successfully', item: item as UserListItem },
    { status: 201 }
  );
}

// DELETE /api/list-items - Remove a page from a list
export async function DELETE(request: Request) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { supabase, user } = auth;

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { item_id } = body;

  // Validate item_id
  if (!item_id || typeof item_id !== 'string') {
    return NextResponse.json(
      { error: 'Item ID is required' },
      { status: 400 }
    );
  }

  // Delete the item (RLS will ensure user owns the list)
  const { error } = await supabase
    .from('user_list_items')
    .delete()
    .eq('id', item_id);

  if (error) {
    console.error('Error deleting list item:', error);
    return NextResponse.json(
      { error: 'Failed to remove page from list' },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: 'Page removed from list successfully' });
}

// PATCH /api/list-items - Update a list item's title/description
export async function PATCH(request: Request) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { supabase, user } = auth;

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { item_id, title, description } = body;

  // Validate item_id
  if (!item_id || typeof item_id !== 'string') {
    return NextResponse.json(
      { error: 'Item ID is required' },
      { status: 400 }
    );
  }

  // Validate at least one field is being updated
  if (title === undefined && description === undefined) {
    return NextResponse.json(
      { error: 'At least one field (title or description) must be provided' },
      { status: 400 }
    );
  }

  // Validate field values
  if (title !== undefined && title !== null && (typeof title !== 'string' || title.length > 200)) {
    return NextResponse.json(
      { error: 'Title must be a string with maximum 200 characters' },
      { status: 400 }
    );
  }

  if (description !== undefined && description !== null && (typeof description !== 'string' || description.length > 1000)) {
    return NextResponse.json(
      { error: 'Description must be a string with maximum 1000 characters' },
      { status: 400 }
    );
  }

  // Build update object
  const updates: any = {
    updated_at: new Date().toISOString(),
  };

  if (title !== undefined) {
    updates.title = title?.trim() || null;
  }

  if (description !== undefined) {
    updates.description = description?.trim() || null;
  }

  // Update the item (RLS will ensure user owns the list)
  const { data: item, error } = await supabase
    .from('user_list_items')
    .update(updates)
    .eq('id', item_id)
    .select()
    .single();

  if (error) {
    console.error('Error updating list item:', error);
    return NextResponse.json(
      { error: 'Failed to update list item' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: 'List item updated successfully', item: item as UserListItem }
  );
}
