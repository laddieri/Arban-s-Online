import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UserList, UserListInsert } from '@/lib/supabase/types';

// GET /api/lists - Get all lists for the authenticated user
export async function GET() {
  const supabase = await createClient();

  // Check if Supabase is configured
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  // Fetch all lists for the user
  const { data: lists, error } = await supabase
    .from('user_lists')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lists' },
      { status: 500 }
    );
  }

  return NextResponse.json({ lists: lists as UserList[] });
}

// POST /api/lists - Create a new list
export async function POST(request: Request) {
  const supabase = await createClient();

  // Check if Supabase is configured
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

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

  const { name } = body;

  // Validate name
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json(
      { error: 'List name is required' },
      { status: 400 }
    );
  }

  if (name.trim().length > 100) {
    return NextResponse.json(
      { error: 'List name must be 100 characters or less' },
      { status: 400 }
    );
  }

  // Create the list
  const newList: UserListInsert = {
    user_id: user.id,
    name: name.trim(),
  };

  const { data: list, error } = await supabase
    .from('user_lists')
    .insert(newList)
    .select()
    .single();

  if (error) {
    console.error('Error creating list:', error);
    return NextResponse.json(
      { error: 'Failed to create list' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: 'List created successfully', list: list as UserList },
    { status: 201 }
  );
}

// DELETE /api/lists - Delete a list
export async function DELETE(request: Request) {
  const supabase = await createClient();

  // Check if Supabase is configured
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

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

  const { list_id } = body;

  // Validate list_id
  if (!list_id || typeof list_id !== 'string') {
    return NextResponse.json(
      { error: 'List ID is required' },
      { status: 400 }
    );
  }

  // Delete the list (cascade will delete all items)
  const { error } = await supabase
    .from('user_lists')
    .delete()
    .eq('id', list_id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting list:', error);
    return NextResponse.json(
      { error: 'Failed to delete list' },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: 'List deleted successfully' });
}

// PATCH /api/lists - Update a list (rename)
export async function PATCH(request: Request) {
  const supabase = await createClient();

  // Check if Supabase is configured
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

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

  const { list_id, name } = body;

  // Validate inputs
  if (!list_id || typeof list_id !== 'string') {
    return NextResponse.json(
      { error: 'List ID is required' },
      { status: 400 }
    );
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json(
      { error: 'List name is required' },
      { status: 400 }
    );
  }

  if (name.trim().length > 100) {
    return NextResponse.json(
      { error: 'List name must be 100 characters or less' },
      { status: 400 }
    );
  }

  // Update the list
  const { data: list, error } = await supabase
    .from('user_lists')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', list_id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating list:', error);
    return NextResponse.json(
      { error: 'Failed to update list' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: 'List updated successfully', list: list as UserList }
  );
}
