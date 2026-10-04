ALTER TABLE `game_characters` ADD `deleted_at` integer;
--> statement-breakpoint
DROP TRIGGER game_command_revision_guard;
--> statement-breakpoint
CREATE TRIGGER game_command_revision_guard
BEFORE INSERT ON game_command_receipts
BEGIN
  SELECT RAISE(ABORT, 'game_command_conflict')
  WHERE NOT EXISTS (
    SELECT 1 FROM game_characters
    WHERE id = NEW.character_id AND user_id = NEW.user_id
      AND revision = NEW.base_revision AND deleted_at IS NULL
  );
END;
