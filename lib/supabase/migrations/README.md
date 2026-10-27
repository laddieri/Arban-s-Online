# Database Migrations

This directory contains SQL migration files for the Arban's Online database.

## How to Run Migrations

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Open the migration file (e.g., `001_create_user_favorites.sql`)
4. Copy the SQL content
5. Paste it into the SQL Editor
6. Click "Run" to execute the migration

## Adding a Migration

1. Add the next numbered file (e.g. `012_short_description.sql`) for existing
   projects to run
2. Make the same change in `000_fresh_project_setup.sql`, which new projects
   run instead of the whole chain
3. Check they agree: `./scripts/check-schema-drift.sh` (needs a local
   Postgres via the `PG*` env vars; CI runs it on every push)

## Available Migrations

### 001_create_user_favorites.sql

**Purpose:** Creates the `user_favorites` table to allow users to favorite specific pages.

**What it does:**
- Creates `user_favorites` table with columns: `id`, `user_id`, `page_number`, `created_at`
- Adds unique constraint to prevent duplicate favorites (same user + page)
- Creates indexes for performance optimization
- Enables Row Level Security (RLS)
- Creates RLS policies:
  - Users can view their own favorites
  - Users can add their own favorites
  - Users can delete their own favorites

**To run this migration:**
1. Open Supabase SQL Editor
2. Copy contents of `001_create_user_favorites.sql`
3. Paste and execute

**Note:** This migration is required for the favorites feature to work. Without it, the favorites functionality will fail.
