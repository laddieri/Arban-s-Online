import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/api';

// POST /api/list-items/reorder { list_id, item_ids }
// Saves a new order for a list: item_ids is the complete list of the list's
// item ids in the desired order. Positions are rewritten 1..n.
export async function POST(request: Request) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { supabase, user } = auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { list_id, item_ids } = body;
  if (!list_id || typeof list_id !== 'string') {
    return NextResponse.json({ error: 'List ID is required' }, { status: 400 });
  }
  if (
    !Array.isArray(item_ids) ||
    item_ids.length === 0 ||
    item_ids.length > 500 ||
    item_ids.some(id => typeof id !== 'string')
  ) {
    return NextResponse.json({ error: 'item_ids must be a list of item ids' }, { status: 400 });
  }

  // The order must cover exactly the list's current items (and confirms
  // ownership: the join only matches the caller's own list)
  const { data: existing, error: fetchError } = await supabase
    .from('user_list_items')
    .select('id, list_id, page_number, book_id, user_lists!inner(user_id)')
    .eq('list_id', list_id)
    .eq('user_lists.user_id', user.id);

  if (fetchError) {
    console.error('Error fetching list items:', fetchError);
    return NextResponse.json({ error: 'Failed to reorder items' }, { status: 500 });
  }

  const existingIds = new Set((existing ?? []).map(item => item.id));
  const providedIds = new Set(item_ids);
  if (
    item_ids.length !== existingIds.size ||
    existingIds.size !== providedIds.size ||
    [...existingIds].some(id => !providedIds.has(id))
  ) {
    return NextResponse.json(
      { error: 'item_ids must contain every item of the list exactly once' },
      { status: 400 }
    );
  }

  // One upsert statement rewrites every position atomically (a failure
  // can't leave the list half-reordered). Rows always conflict on id, so
  // this only ever updates (barring an item deleted mid-request, which
  // would be re-created); the NOT NULL columns ride along because
  // PostgREST builds the statement as an INSERT, and are unchanged.
  const byId = new Map((existing ?? []).map(item => [item.id, item]));
  const now = new Date().toISOString();
  const rows = item_ids.map((id: string, index: number) => {
    const item = byId.get(id)!;
    return {
      id,
      list_id: item.list_id,
      page_number: item.page_number,
      book_id: item.book_id,
      position: index + 1,
      updated_at: now,
    };
  });
  const { error: upsertError } = await supabase
    .from('user_list_items')
    .upsert(rows, { onConflict: 'id' });
  if (upsertError) {
    console.error('Error reordering items:', upsertError);
    return NextResponse.json({ error: 'Failed to reorder items' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Order saved' });
}
