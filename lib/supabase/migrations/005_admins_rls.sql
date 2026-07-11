-- Migration 005: enable Row Level Security on the admins table.
--
-- The table originally shipped without RLS, which meant any signed-in user
-- could list admin emails. A self-row SELECT policy is all the app needs:
-- requireAdmin() and the UserMenu admin check look up only the caller's own
-- row, and the EXISTS() subqueries in the video_submissions admin policies
-- run as the querying user, so they too only need to see that user's row.
-- Rows are managed via the SQL editor, so no INSERT/UPDATE/DELETE policies.
--
-- Only needed on projects created before 000_fresh_project_setup.sql
-- existed; the bootstrap script already includes this.

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can check their own admin status"
  ON admins FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);
