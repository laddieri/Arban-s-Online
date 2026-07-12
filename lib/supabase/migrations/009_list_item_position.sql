-- Migration 009: user-defined ordering for list items.
--
-- Items were implicitly ordered by created_at; position makes the order
-- explicit so exercises can be rearranged. Existing items keep their
-- current order (oldest first - the order the practice bar plays them in).

ALTER TABLE user_list_items ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

UPDATE user_list_items SET position = ranked.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY list_id ORDER BY created_at) AS rn
  FROM user_list_items
) ranked
WHERE user_list_items.id = ranked.id;

ALTER TABLE user_list_items ALTER COLUMN position SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_list_items_position
  ON user_list_items(list_id, position);
