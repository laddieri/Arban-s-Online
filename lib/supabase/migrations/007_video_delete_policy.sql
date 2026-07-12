-- Migration 007: allow admins to delete video submissions.
--
-- The table has always had SELECT/INSERT/UPDATE policies but never a DELETE
-- policy, so with RLS enabled the admin dashboard's delete matched zero rows
-- and silently did nothing (Postgres treats that as success, not an error).

CREATE POLICY "Admins can delete submissions"
  ON video_submissions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()::text));
