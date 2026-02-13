-- Migration: Transform favorites into customizable lists feature
-- This migration creates tables for user-defined lists and list items

-- Create user_lists table to store custom lists
CREATE TABLE user_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for user_lists
CREATE INDEX idx_user_lists_user_id ON user_lists(user_id);
CREATE INDEX idx_user_lists_created_at ON user_lists(created_at DESC);

-- Create user_list_items table to store pages added to lists
CREATE TABLE user_list_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES user_lists(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_id, page_number)
);

-- Create indexes for user_list_items
CREATE INDEX idx_user_list_items_list_id ON user_list_items(list_id);
CREATE INDEX idx_user_list_items_page_number ON user_list_items(page_number);
CREATE INDEX idx_user_list_items_created_at ON user_list_items(created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_list_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_lists
-- Users can view their own lists
CREATE POLICY "Users can view their own lists"
  ON user_lists
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can create their own lists
CREATE POLICY "Users can create their own lists"
  ON user_lists
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own lists
CREATE POLICY "Users can update their own lists"
  ON user_lists
  FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Users can delete their own lists
CREATE POLICY "Users can delete their own lists"
  ON user_lists
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- RLS Policies for user_list_items
-- Users can view items in their own lists
CREATE POLICY "Users can view items in their own lists"
  ON user_list_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_lists
      WHERE user_lists.id = user_list_items.list_id
      AND user_lists.user_id = auth.uid()::text
    )
  );

-- Users can add items to their own lists
CREATE POLICY "Users can add items to their own lists"
  ON user_list_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_lists
      WHERE user_lists.id = user_list_items.list_id
      AND user_lists.user_id = auth.uid()::text
    )
  );

-- Users can update items in their own lists
CREATE POLICY "Users can update items in their own lists"
  ON user_list_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_lists
      WHERE user_lists.id = user_list_items.list_id
      AND user_lists.user_id = auth.uid()::text
    )
  );

-- Users can delete items from their own lists
CREATE POLICY "Users can delete items from their own lists"
  ON user_list_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_lists
      WHERE user_lists.id = user_list_items.list_id
      AND user_lists.user_id = auth.uid()::text
    )
  );

-- Migrate existing favorites to a default "Favorites" list for each user
-- This ensures backward compatibility
INSERT INTO user_lists (user_id, name, created_at)
SELECT DISTINCT user_id, 'Favorites', MIN(created_at)
FROM user_favorites
GROUP BY user_id;

-- Migrate favorite items to the new list items table
INSERT INTO user_list_items (list_id, page_number, created_at)
SELECT ul.id, uf.page_number, uf.created_at
FROM user_favorites uf
JOIN user_lists ul ON ul.user_id = uf.user_id AND ul.name = 'Favorites';

-- Drop the old user_favorites table (optional - uncomment if you want to remove it)
-- DROP TABLE user_favorites;
