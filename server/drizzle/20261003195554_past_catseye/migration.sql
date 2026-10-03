ALTER TABLE `game_encounter_actors` ADD `defending_position` integer;--> statement-breakpoint
ALTER TABLE `game_encounters` ADD `phase` text DEFAULT 'selectingAction' NOT NULL;--> statement-breakpoint
ALTER TABLE `game_encounters` ADD `algorithm` text DEFAULT 'xoroshiro128plus' NOT NULL;--> statement-breakpoint
UPDATE game_encounters SET phase = COALESCE(result, 'selectingAction');
--> statement-breakpoint
CREATE TRIGGER game_encounter_format_insert BEFORE INSERT ON game_encounters
WHEN NEW.phase NOT IN ('selectingAction','victory','defeat') OR NEW.algorithm != 'xoroshiro128plus' OR NEW.phase != COALESCE(NEW.result,'selectingAction')
BEGIN SELECT RAISE(ABORT, 'invalid_encounter_format'); END;
--> statement-breakpoint
CREATE TRIGGER game_encounter_format_update BEFORE UPDATE ON game_encounters
WHEN NEW.phase NOT IN ('selectingAction','victory','defeat') OR NEW.algorithm != 'xoroshiro128plus' OR NEW.phase != COALESCE(NEW.result,'selectingAction')
BEGIN SELECT RAISE(ABORT, 'invalid_encounter_format'); END;
