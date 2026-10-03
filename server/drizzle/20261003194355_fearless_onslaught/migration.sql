CREATE TABLE `game_campaigns` (
	`character_id` text PRIMARY KEY NOT NULL,
	`world_id` text NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`encounter_count` integer NOT NULL,
	`active_service` text,
	`resting` integer NOT NULL,
	`last_rest_tick` integer,
	`rest_lease_until` integer,
	CONSTRAINT `fk_game_campaigns_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_campaigns_check_0" CHECK(x >= 0),
	CONSTRAINT "game_campaigns_check_1" CHECK(y >= 0),
	CONSTRAINT "game_campaigns_check_2" CHECK(encounter_count BETWEEN 0 AND 1000000),
	CONSTRAINT "game_campaigns_check_3" CHECK(resting IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `game_character_titles` (
	`character_id` text NOT NULL,
	`title_id` text NOT NULL,
	`discovered_position` integer,
	`earned_position` integer,
	`source` text,
	CONSTRAINT `game_character_titles_pk` PRIMARY KEY(`character_id`, `title_id`),
	CONSTRAINT `fk_game_character_titles_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_character_titles_check_0" CHECK(discovered_position IS NULL OR discovered_position BETWEEN 0 AND 999),
	CONSTRAINT "game_character_titles_check_1" CHECK(earned_position IS NULL OR earned_position BETWEEN 0 AND 999)
);
--> statement-breakpoint
CREATE TABLE `game_characters` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`talent` text NOT NULL,
	`age` integer NOT NULL,
	`revision` integer NOT NULL,
	`content_version` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_game_characters_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_characters_check_0" CHECK(talent IN ('warrior','archery','mage')),
	CONSTRAINT "game_characters_check_1" CHECK(age BETWEEN 10 AND 17),
	CONSTRAINT "game_characters_check_2" CHECK(revision >= 0),
	CONSTRAINT "game_characters_check_3" CHECK(length(trim(name)) BETWEEN 1 AND 24)
);
--> statement-breakpoint
CREATE TABLE `game_command_receipts` (
	`user_id` text NOT NULL,
	`command_id` text NOT NULL,
	`character_id` text NOT NULL,
	`request_hash` text NOT NULL,
	`base_revision` integer NOT NULL,
	`committed_revision` integer NOT NULL,
	`outcome` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `game_command_receipts_pk` PRIMARY KEY(`user_id`, `command_id`),
	CONSTRAINT `fk_game_command_receipts_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_command_receipts_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_command_receipts_check_0" CHECK(committed_revision = base_revision + 1),
	CONSTRAINT "game_command_receipts_check_1" CHECK(base_revision >= 0),
	CONSTRAINT "game_command_receipts_check_2" CHECK(json_valid(outcome))
);
--> statement-breakpoint
CREATE TABLE `game_discovered_skills` (
	`character_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`position` integer NOT NULL,
	CONSTRAINT `game_discovered_skills_pk` PRIMARY KEY(`character_id`, `skill_id`),
	CONSTRAINT `fk_game_discovered_skills_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_discovered_skills_check_0" CHECK(position BETWEEN 0 AND 999)
);
--> statement-breakpoint
CREATE TABLE `game_dungeon_effects` (
	`character_id` text NOT NULL,
	`position` integer NOT NULL,
	`status_id` text NOT NULL,
	`stacks` integer NOT NULL,
	CONSTRAINT `game_dungeon_effects_pk` PRIMARY KEY(`character_id`, `position`),
	CONSTRAINT `fk_game_dungeon_effects_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_dungeon_effects_character_id_game_dungeon_runs_character_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_dungeon_runs`(`character_id`) ON DELETE CASCADE,
	CONSTRAINT "game_dungeon_effects_check_0" CHECK(position BETWEEN 0 AND 11),
	CONSTRAINT "game_dungeon_effects_check_1" CHECK(stacks BETWEEN 1 AND 10)
);
--> statement-breakpoint
CREATE TABLE `game_dungeon_flags` (
	`character_id` text NOT NULL,
	`kind` text NOT NULL,
	`object_id` text NOT NULL,
	`position` integer NOT NULL,
	CONSTRAINT `game_dungeon_flags_pk` PRIMARY KEY(`character_id`, `kind`, `object_id`),
	CONSTRAINT `fk_game_dungeon_flags_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_dungeon_flags_character_id_game_dungeon_runs_character_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_dungeon_runs`(`character_id`) ON DELETE CASCADE,
	CONSTRAINT "game_dungeon_flags_check_0" CHECK(kind IN ('cleared','opened','revealedMimics','usedFountains')),
	CONSTRAINT "game_dungeon_flags_check_1" CHECK(position BETWEEN 0 AND 16)
);
--> statement-breakpoint
CREATE TABLE `game_dungeon_keys` (
	`character_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`x` integer,
	`y` integer,
	CONSTRAINT `game_dungeon_keys_pk` PRIMARY KEY(`character_id`, `kind`),
	CONSTRAINT `fk_game_dungeon_keys_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_dungeon_keys_character_id_game_dungeon_runs_character_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_dungeon_runs`(`character_id`) ON DELETE CASCADE,
	CONSTRAINT "game_dungeon_keys_check_0" CHECK(kind IN ('bossKey','treasureKey')),
	CONSTRAINT "game_dungeon_keys_check_1" CHECK(status IN ('absent','dropped','held','spent')),
	CONSTRAINT "game_dungeon_keys_check_2" CHECK((x IS NULL) = (y IS NULL))
);
--> statement-breakpoint
CREATE TABLE `game_dungeon_runs` (
	`character_id` text PRIMARY KEY NOT NULL,
	`definition_id` text NOT NULL,
	`return_world_id` text NOT NULL,
	`return_x` integer NOT NULL,
	`return_y` integer NOT NULL,
	`blueprint` text NOT NULL,
	`boss_door_opened` integer NOT NULL,
	`selected_chest` text,
	CONSTRAINT `fk_game_dungeon_runs_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_dungeon_runs_check_0" CHECK(boss_door_opened IN (0,1)),
	CONSTRAINT "game_dungeon_runs_check_1" CHECK(json_valid(blueprint))
);
--> statement-breakpoint
CREATE TABLE `game_enchant_receipts` (
	`character_id` text NOT NULL,
	`operation_id` text NOT NULL,
	`position` integer NOT NULL,
	`kind` text NOT NULL,
	`message` text NOT NULL,
	`success` integer NOT NULL,
	CONSTRAINT `game_enchant_receipts_pk` PRIMARY KEY(`character_id`, `operation_id`),
	CONSTRAINT `fk_game_enchant_receipts_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_enchant_receipts_check_0" CHECK(position BETWEEN 0 AND 99),
	CONSTRAINT "game_enchant_receipts_check_1" CHECK(kind IN ('apply','burn')),
	CONSTRAINT "game_enchant_receipts_check_2" CHECK(success IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `game_enchant_recovered_items` (
	`character_id` text NOT NULL,
	`operation_id` text NOT NULL,
	`position` integer NOT NULL,
	`item_id` text NOT NULL,
	CONSTRAINT `game_enchant_recovered_items_pk` PRIMARY KEY(`character_id`, `operation_id`, `position`),
	CONSTRAINT `fk_game_enchant_recovered_items_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_enchant_recovered_items_character_id_operation_id_game_enchant_receipts_character_id_operation_id_fk` FOREIGN KEY (`character_id`,`operation_id`) REFERENCES `game_enchant_receipts`(`character_id`,`operation_id`) ON DELETE CASCADE,
	CONSTRAINT "game_enchant_recovered_items_check_0" CHECK(position BETWEEN 0 AND 1)
);
--> statement-breakpoint
CREATE TABLE `game_encounter_actor_values` (
	`character_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`path` text NOT NULL,
	`value_type` text NOT NULL,
	`text_value` text,
	`number_value` real,
	CONSTRAINT `game_encounter_actor_values_pk` PRIMARY KEY(`character_id`, `actor_id`, `path`),
	CONSTRAINT `fk_game_encounter_actor_values_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_encounter_actor_values_character_id_actor_id_game_encounter_actors_character_id_actor_id_fk` FOREIGN KEY (`character_id`,`actor_id`) REFERENCES `game_encounter_actors`(`character_id`,`actor_id`) ON DELETE CASCADE,
	CONSTRAINT "game_encounter_actor_values_check_0" CHECK(value_type IN ('object','array','string','number','boolean')),
	CONSTRAINT "game_encounter_actor_values_check_1" CHECK((value_type = 'string' AND text_value IS NOT NULL AND number_value IS NULL) OR (value_type IN ('number','boolean') AND number_value IS NOT NULL AND text_value IS NULL) OR (value_type IN ('object','array') AND text_value IS NULL AND number_value IS NULL))
);
--> statement-breakpoint
CREATE TABLE `game_encounter_actors` (
	`character_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`position` integer NOT NULL,
	CONSTRAINT `game_encounter_actors_pk` PRIMARY KEY(`character_id`, `actor_id`),
	CONSTRAINT `fk_game_encounter_actors_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_encounter_actors_character_id_game_encounters_character_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_encounters`(`character_id`) ON DELETE CASCADE,
	CONSTRAINT "game_encounter_actors_check_0" CHECK(position >= 0)
);
--> statement-breakpoint
CREATE TABLE `game_encounter_cooldowns` (
	`character_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`path` text NOT NULL,
	`value_type` text NOT NULL,
	`text_value` text,
	`number_value` real,
	CONSTRAINT `game_encounter_cooldowns_pk` PRIMARY KEY(`character_id`, `actor_id`, `path`),
	CONSTRAINT `fk_game_encounter_cooldowns_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_encounter_cooldowns_character_id_actor_id_game_encounter_actors_character_id_actor_id_fk` FOREIGN KEY (`character_id`,`actor_id`) REFERENCES `game_encounter_actors`(`character_id`,`actor_id`) ON DELETE CASCADE,
	CONSTRAINT "game_encounter_cooldowns_check_0" CHECK(value_type IN ('object','array','string','number','boolean')),
	CONSTRAINT "game_encounter_cooldowns_check_1" CHECK((value_type = 'string' AND text_value IS NOT NULL AND number_value IS NULL) OR (value_type IN ('number','boolean') AND number_value IS NOT NULL AND text_value IS NULL) OR (value_type IN ('object','array') AND text_value IS NULL AND number_value IS NULL))
);
--> statement-breakpoint
CREATE TABLE `game_encounter_enemy_history` (
	`character_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`skill_id` text,
	`target_id` text,
	CONSTRAINT `game_encounter_enemy_history_pk` PRIMARY KEY(`character_id`, `actor_id`),
	CONSTRAINT `fk_game_encounter_enemy_history_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_encounter_enemy_history_character_id_actor_id_game_encounter_actors_character_id_actor_id_fk` FOREIGN KEY (`character_id`,`actor_id`) REFERENCES `game_encounter_actors`(`character_id`,`actor_id`) ON DELETE CASCADE,
	CONSTRAINT "game_encounter_enemy_history_check_0" CHECK(action IN ('attack','skill','defend','rest'))
);
--> statement-breakpoint
CREATE TABLE `game_encounter_inventory` (
	`character_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`path` text NOT NULL,
	`value_type` text NOT NULL,
	`text_value` text,
	`number_value` real,
	CONSTRAINT `game_encounter_inventory_pk` PRIMARY KEY(`character_id`, `actor_id`, `path`),
	CONSTRAINT `fk_game_encounter_inventory_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_encounter_inventory_character_id_actor_id_game_encounter_actors_character_id_actor_id_fk` FOREIGN KEY (`character_id`,`actor_id`) REFERENCES `game_encounter_actors`(`character_id`,`actor_id`) ON DELETE CASCADE,
	CONSTRAINT "game_encounter_inventory_check_0" CHECK(value_type IN ('object','array','string','number','boolean')),
	CONSTRAINT "game_encounter_inventory_check_1" CHECK((value_type = 'string' AND text_value IS NOT NULL AND number_value IS NULL) OR (value_type IN ('number','boolean') AND number_value IS NOT NULL AND text_value IS NULL) OR (value_type IN ('object','array') AND text_value IS NULL AND number_value IS NULL))
);
--> statement-breakpoint
CREATE TABLE `game_encounter_quest_evidence` (
	`character_id` text NOT NULL,
	`quest_id` text NOT NULL,
	`stage_id` text NOT NULL,
	`objective_id` text NOT NULL,
	`count` integer NOT NULL,
	CONSTRAINT `game_encounter_quest_evidence_pk` PRIMARY KEY(`character_id`, `quest_id`, `objective_id`),
	CONSTRAINT `fk_game_encounter_quest_evidence_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_encounter_quest_evidence_character_id_game_encounters_character_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_encounters`(`character_id`) ON DELETE CASCADE,
	CONSTRAINT "game_encounter_quest_evidence_check_0" CHECK(count BETWEEN 0 AND 999)
);
--> statement-breakpoint
CREATE TABLE `game_encounter_reward_items` (
	`character_id` text NOT NULL,
	`position` integer NOT NULL,
	`item_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`collectable` integer NOT NULL,
	CONSTRAINT `game_encounter_reward_items_pk` PRIMARY KEY(`character_id`, `position`),
	CONSTRAINT `fk_game_encounter_reward_items_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_encounter_reward_items_character_id_game_encounter_rewards_character_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_encounter_rewards`(`character_id`) ON DELETE CASCADE,
	CONSTRAINT "game_encounter_reward_items_check_0" CHECK(position >= 0),
	CONSTRAINT "game_encounter_reward_items_check_1" CHECK(quantity >= 0),
	CONSTRAINT "game_encounter_reward_items_check_2" CHECK(collectable BETWEEN 0 AND quantity)
);
--> statement-breakpoint
CREATE TABLE `game_encounter_rewards` (
	`character_id` text PRIMARY KEY NOT NULL,
	`gold` integer NOT NULL,
	`experience` integer NOT NULL,
	`word0` integer NOT NULL,
	`word1` integer NOT NULL,
	`word2` integer NOT NULL,
	`word3` integer NOT NULL,
	CONSTRAINT `fk_game_encounter_rewards_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_encounter_rewards_character_id_game_encounters_character_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_encounters`(`character_id`) ON DELETE CASCADE,
	CONSTRAINT "game_encounter_rewards_check_0" CHECK(gold >= 0),
	CONSTRAINT "game_encounter_rewards_check_1" CHECK(experience >= 0)
);
--> statement-breakpoint
CREATE TABLE `game_encounter_skills` (
	`character_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`path` text NOT NULL,
	`value_type` text NOT NULL,
	`text_value` text,
	`number_value` real,
	CONSTRAINT `game_encounter_skills_pk` PRIMARY KEY(`character_id`, `actor_id`, `path`),
	CONSTRAINT `fk_game_encounter_skills_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_encounter_skills_character_id_actor_id_game_encounter_actors_character_id_actor_id_fk` FOREIGN KEY (`character_id`,`actor_id`) REFERENCES `game_encounter_actors`(`character_id`,`actor_id`) ON DELETE CASCADE,
	CONSTRAINT "game_encounter_skills_check_0" CHECK(value_type IN ('object','array','string','number','boolean')),
	CONSTRAINT "game_encounter_skills_check_1" CHECK((value_type = 'string' AND text_value IS NOT NULL AND number_value IS NULL) OR (value_type IN ('number','boolean') AND number_value IS NOT NULL AND text_value IS NULL) OR (value_type IN ('object','array') AND text_value IS NULL AND number_value IS NULL))
);
--> statement-breakpoint
CREATE TABLE `game_encounter_sources` (
	`character_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`path` text NOT NULL,
	`value_type` text NOT NULL,
	`text_value` text,
	`number_value` real,
	CONSTRAINT `game_encounter_sources_pk` PRIMARY KEY(`character_id`, `actor_id`, `path`),
	CONSTRAINT `fk_game_encounter_sources_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_encounter_sources_character_id_actor_id_game_encounter_actors_character_id_actor_id_fk` FOREIGN KEY (`character_id`,`actor_id`) REFERENCES `game_encounter_actors`(`character_id`,`actor_id`) ON DELETE CASCADE,
	CONSTRAINT "game_encounter_sources_check_0" CHECK(value_type IN ('object','array','string','number','boolean')),
	CONSTRAINT "game_encounter_sources_check_1" CHECK((value_type = 'string' AND text_value IS NOT NULL AND number_value IS NULL) OR (value_type IN ('number','boolean') AND number_value IS NOT NULL AND text_value IS NULL) OR (value_type IN ('object','array') AND text_value IS NULL AND number_value IS NULL))
);
--> statement-breakpoint
CREATE TABLE `game_encounter_stats` (
	`character_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`path` text NOT NULL,
	`value_type` text NOT NULL,
	`text_value` text,
	`number_value` real,
	CONSTRAINT `game_encounter_stats_pk` PRIMARY KEY(`character_id`, `actor_id`, `path`),
	CONSTRAINT `fk_game_encounter_stats_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_encounter_stats_character_id_actor_id_game_encounter_actors_character_id_actor_id_fk` FOREIGN KEY (`character_id`,`actor_id`) REFERENCES `game_encounter_actors`(`character_id`,`actor_id`) ON DELETE CASCADE,
	CONSTRAINT "game_encounter_stats_check_0" CHECK(value_type IN ('object','array','string','number','boolean')),
	CONSTRAINT "game_encounter_stats_check_1" CHECK((value_type = 'string' AND text_value IS NOT NULL AND number_value IS NULL) OR (value_type IN ('number','boolean') AND number_value IS NOT NULL AND text_value IS NULL) OR (value_type IN ('object','array') AND text_value IS NULL AND number_value IS NULL))
);
--> statement-breakpoint
CREATE TABLE `game_encounter_statuses` (
	`character_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`path` text NOT NULL,
	`value_type` text NOT NULL,
	`text_value` text,
	`number_value` real,
	CONSTRAINT `game_encounter_statuses_pk` PRIMARY KEY(`character_id`, `actor_id`, `path`),
	CONSTRAINT `fk_game_encounter_statuses_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_encounter_statuses_character_id_actor_id_game_encounter_actors_character_id_actor_id_fk` FOREIGN KEY (`character_id`,`actor_id`) REFERENCES `game_encounter_actors`(`character_id`,`actor_id`) ON DELETE CASCADE,
	CONSTRAINT "game_encounter_statuses_check_0" CHECK(value_type IN ('object','array','string','number','boolean')),
	CONSTRAINT "game_encounter_statuses_check_1" CHECK((value_type = 'string' AND text_value IS NOT NULL AND number_value IS NULL) OR (value_type IN ('number','boolean') AND number_value IS NOT NULL AND text_value IS NULL) OR (value_type IN ('object','array') AND text_value IS NULL AND number_value IS NULL))
);
--> statement-breakpoint
CREATE TABLE `game_encounter_training` (
	`character_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`objective_id` text NOT NULL,
	`count` integer NOT NULL,
	CONSTRAINT `game_encounter_training_pk` PRIMARY KEY(`character_id`, `skill_id`, `objective_id`),
	CONSTRAINT `fk_game_encounter_training_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_encounter_training_character_id_game_encounters_character_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_encounters`(`character_id`) ON DELETE CASCADE,
	CONSTRAINT "game_encounter_training_check_0" CHECK(count BETWEEN 0 AND 1000)
);
--> statement-breakpoint
CREATE TABLE `game_encounter_turn_order` (
	`character_id` text NOT NULL,
	`position` integer NOT NULL,
	`actor_id` text NOT NULL,
	`defending` integer NOT NULL,
	CONSTRAINT `game_encounter_turn_order_pk` PRIMARY KEY(`character_id`, `position`),
	CONSTRAINT `fk_game_encounter_turn_order_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_encounter_turn_order_character_id_actor_id_game_encounter_actors_character_id_actor_id_fk` FOREIGN KEY (`character_id`,`actor_id`) REFERENCES `game_encounter_actors`(`character_id`,`actor_id`) ON DELETE CASCADE,
	CONSTRAINT "game_encounter_turn_order_check_0" CHECK(position >= 0),
	CONSTRAINT "game_encounter_turn_order_check_1" CHECK(defending IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `game_encounters` (
	`character_id` text PRIMARY KEY NOT NULL,
	`encounter_id` text NOT NULL,
	`world_id` text NOT NULL,
	`object_id` text NOT NULL,
	`map_id` text NOT NULL,
	`seed` integer NOT NULL,
	`version` integer NOT NULL,
	`word0` integer NOT NULL,
	`word1` integer NOT NULL,
	`word2` integer NOT NULL,
	`word3` integer NOT NULL,
	`result` text,
	`action_sequence` integer NOT NULL,
	`cursor` integer NOT NULL,
	`training_last_action` integer NOT NULL,
	`quest_last_action` integer NOT NULL,
	`title_eligible` integer NOT NULL,
	`title_flawless` integer NOT NULL,
	CONSTRAINT `fk_game_encounters_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_encounters_check_0" CHECK(version = 1),
	CONSTRAINT "game_encounters_check_1" CHECK(result IS NULL OR result IN ('victory','defeat')),
	CONSTRAINT "game_encounters_check_2" CHECK(action_sequence >= 0),
	CONSTRAINT "game_encounters_check_3" CHECK(cursor >= 0),
	CONSTRAINT "game_encounters_check_4" CHECK(training_last_action >= 0),
	CONSTRAINT "game_encounters_check_5" CHECK(quest_last_action >= 0),
	CONSTRAINT "game_encounters_check_6" CHECK(title_eligible IN (0,1)),
	CONSTRAINT "game_encounters_check_7" CHECK(title_flawless IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `game_equipment_enchant_values` (
	`character_id` text NOT NULL,
	`instance_id` text NOT NULL,
	`slot` text NOT NULL,
	`stat_id` text NOT NULL,
	`value` integer NOT NULL,
	CONSTRAINT `game_equipment_enchant_values_pk` PRIMARY KEY(`character_id`, `instance_id`, `slot`, `stat_id`),
	CONSTRAINT `fk_game_equipment_enchant_values_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_equipment_enchant_values_character_id_instance_id_slot_game_equipment_enchants_character_id_instance_id_slot_fk` FOREIGN KEY (`character_id`,`instance_id`,`slot`) REFERENCES `game_equipment_enchants`(`character_id`,`instance_id`,`slot`) ON DELETE CASCADE,
	CONSTRAINT "game_equipment_enchant_values_check_0" CHECK(value BETWEEN -1000 AND 1000)
);
--> statement-breakpoint
CREATE TABLE `game_equipment_enchants` (
	`character_id` text NOT NULL,
	`instance_id` text NOT NULL,
	`slot` text NOT NULL,
	`enchant_id` text NOT NULL,
	CONSTRAINT `game_equipment_enchants_pk` PRIMARY KEY(`character_id`, `instance_id`, `slot`),
	CONSTRAINT `fk_game_equipment_enchants_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_equipment_enchants_character_id_instance_id_game_equipment_instances_character_id_instance_id_fk` FOREIGN KEY (`character_id`,`instance_id`) REFERENCES `game_equipment_instances`(`character_id`,`instance_id`) ON DELETE CASCADE,
	CONSTRAINT "game_equipment_enchants_check_0" CHECK(slot IN ('prefix','suffix'))
);
--> statement-breakpoint
CREATE TABLE `game_equipment_instances` (
	`character_id` text NOT NULL,
	`instance_id` text NOT NULL,
	`definition_id` text NOT NULL,
	`kind` text NOT NULL,
	`durability` integer,
	`locked` integer,
	CONSTRAINT `game_equipment_instances_pk` PRIMARY KEY(`character_id`, `instance_id`),
	CONSTRAINT `fk_game_equipment_instances_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_equipment_instances_check_0" CHECK(kind IN ('weapon','armor')),
	CONSTRAINT "game_equipment_instances_check_1" CHECK((kind = 'weapon' AND durability BETWEEN 0 AND 10000) OR (kind = 'armor' AND durability IS NULL)),
	CONSTRAINT "game_equipment_instances_check_2" CHECK(locked IS NULL OR locked IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `game_heroes` (
	`character_id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`level` integer NOT NULL,
	`cumulative_level` integer NOT NULL,
	`experience` integer NOT NULL,
	`gold` integer NOT NULL,
	`ap` integer NOT NULL,
	`health` integer NOT NULL,
	`mana` integer NOT NULL,
	`stamina` integer NOT NULL,
	`wounds` integer NOT NULL,
	`fullness_tenths` integer NOT NULL,
	`next_weapon_id` integer NOT NULL,
	`next_armor_id` integer NOT NULL,
	CONSTRAINT `fk_game_heroes_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_heroes_check_0" CHECK(level BETWEEN 1 AND 200),
	CONSTRAINT "game_heroes_check_1" CHECK(cumulative_level >= level),
	CONSTRAINT "game_heroes_check_2" CHECK(experience >= 0),
	CONSTRAINT "game_heroes_check_3" CHECK(gold BETWEEN 0 AND 1000000),
	CONSTRAINT "game_heroes_check_4" CHECK(ap BETWEEN 0 AND 1000000),
	CONSTRAINT "game_heroes_check_5" CHECK(health >= 1),
	CONSTRAINT "game_heroes_check_6" CHECK(mana >= 0),
	CONSTRAINT "game_heroes_check_7" CHECK(stamina >= 0),
	CONSTRAINT "game_heroes_check_8" CHECK(wounds >= 0),
	CONSTRAINT "game_heroes_check_9" CHECK(fullness_tenths BETWEEN 500 AND 1000),
	CONSTRAINT "game_heroes_check_10" CHECK(next_weapon_id >= 1),
	CONSTRAINT "game_heroes_check_11" CHECK(next_armor_id >= 1)
);
--> statement-breakpoint
CREATE TABLE `game_inventory_stacks` (
	`character_id` text NOT NULL,
	`item_id` text NOT NULL,
	`quantity` integer NOT NULL,
	CONSTRAINT `game_inventory_stacks_pk` PRIMARY KEY(`character_id`, `item_id`),
	CONSTRAINT `fk_game_inventory_stacks_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_inventory_stacks_check_0" CHECK(quantity BETWEEN 1 AND 999)
);
--> statement-breakpoint
CREATE TABLE `game_item_hotbar` (
	`character_id` text NOT NULL,
	`position` integer NOT NULL,
	`item_id` text NOT NULL,
	CONSTRAINT `game_item_hotbar_pk` PRIMARY KEY(`character_id`, `position`),
	CONSTRAINT `fk_game_item_hotbar_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_item_hotbar_check_0" CHECK(position BETWEEN 0 AND 99)
);
--> statement-breakpoint
CREATE TABLE `game_learned_skills` (
	`character_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`rank` text NOT NULL,
	CONSTRAINT `game_learned_skills_pk` PRIMARY KEY(`character_id`, `skill_id`),
	CONSTRAINT `fk_game_learned_skills_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_learned_skills_check_0" CHECK(rank IN ('F','E','D','C','B','A','9','8','7','6','5','4','3','2','1'))
);
--> statement-breakpoint
CREATE TABLE `game_loadouts` (
	`character_id` text PRIMARY KEY NOT NULL,
	`weapon_id` text,
	`armor_id` text,
	`ammunition_id` text,
	CONSTRAINT `fk_game_loadouts_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_loadouts_character_id_weapon_id_game_equipment_instances_character_id_instance_id_fk` FOREIGN KEY (`character_id`,`weapon_id`) REFERENCES `game_equipment_instances`(`character_id`,`instance_id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_loadouts_character_id_armor_id_game_equipment_instances_character_id_instance_id_fk` FOREIGN KEY (`character_id`,`armor_id`) REFERENCES `game_equipment_instances`(`character_id`,`instance_id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_loadouts_character_id_ammunition_id_game_inventory_stacks_character_id_item_id_fk` FOREIGN KEY (`character_id`,`ammunition_id`) REFERENCES `game_inventory_stacks`(`character_id`,`item_id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `game_milestone_claims` (
	`character_id` text NOT NULL,
	`milestone_id` text NOT NULL,
	`position` integer NOT NULL,
	CONSTRAINT `game_milestone_claims_pk` PRIMARY KEY(`character_id`, `milestone_id`),
	CONSTRAINT `fk_game_milestone_claims_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_milestone_claims_check_0" CHECK(milestone_id = 'intro-melee-lesson'),
	CONSTRAINT "game_milestone_claims_check_1" CHECK(position = 0)
);
--> statement-breakpoint
CREATE TABLE `game_quest_flags` (
	`character_id` text NOT NULL,
	`flag_id` text NOT NULL,
	`position` integer NOT NULL,
	CONSTRAINT `game_quest_flags_pk` PRIMARY KEY(`character_id`, `flag_id`),
	CONSTRAINT `fk_game_quest_flags_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_quest_flags_check_0" CHECK(position BETWEEN 0 AND 999)
);
--> statement-breakpoint
CREATE TABLE `game_quest_objective_counts` (
	`character_id` text NOT NULL,
	`quest_id` text NOT NULL,
	`objective_id` text NOT NULL,
	`count` integer NOT NULL,
	CONSTRAINT `game_quest_objective_counts_pk` PRIMARY KEY(`character_id`, `quest_id`, `objective_id`),
	CONSTRAINT `fk_game_quest_objective_counts_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_quest_objective_counts_character_id_quest_id_game_quests_character_id_quest_id_fk` FOREIGN KEY (`character_id`,`quest_id`) REFERENCES `game_quests`(`character_id`,`quest_id`) ON DELETE CASCADE,
	CONSTRAINT "game_quest_objective_counts_check_0" CHECK(count BETWEEN 0 AND 999)
);
--> statement-breakpoint
CREATE TABLE `game_quests` (
	`character_id` text NOT NULL,
	`quest_id` text NOT NULL,
	`status` text NOT NULL,
	`stage_id` text NOT NULL,
	`claim_id` text,
	CONSTRAINT `game_quests_pk` PRIMARY KEY(`character_id`, `quest_id`),
	CONSTRAINT `fk_game_quests_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_quests_check_0" CHECK(status IN ('available','active','completed'))
);
--> statement-breakpoint
CREATE TABLE `game_rng_streams` (
	`character_id` text NOT NULL,
	`kind` text NOT NULL,
	`seed` integer NOT NULL,
	`algorithm` text NOT NULL,
	`version` integer NOT NULL,
	`word0` integer NOT NULL,
	`word1` integer NOT NULL,
	`word2` integer NOT NULL,
	`word3` integer NOT NULL,
	`next_operation_id` integer,
	CONSTRAINT `game_rng_streams_pk` PRIMARY KEY(`character_id`, `kind`),
	CONSTRAINT `fk_game_rng_streams_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_rng_streams_check_0" CHECK(kind IN ('journey','enchant')),
	CONSTRAINT "game_rng_streams_check_1" CHECK(algorithm = 'xoroshiro128plus'),
	CONSTRAINT "game_rng_streams_check_2" CHECK(version = 1),
	CONSTRAINT "game_rng_streams_check_3" CHECK(word0 != 0 OR word1 != 0 OR word2 != 0 OR word3 != 0)
);
--> statement-breakpoint
CREATE TABLE `game_selected_titles` (
	`character_id` text NOT NULL,
	`slot` text NOT NULL,
	`title_id` text NOT NULL,
	CONSTRAINT `game_selected_titles_pk` PRIMARY KEY(`character_id`, `slot`),
	CONSTRAINT `fk_game_selected_titles_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_selected_titles_character_id_title_id_game_character_titles_character_id_title_id_fk` FOREIGN KEY (`character_id`,`title_id`) REFERENCES `game_character_titles`(`character_id`,`title_id`) ON DELETE CASCADE,
	CONSTRAINT "game_selected_titles_check_0" CHECK(slot IN ('first','second'))
);
--> statement-breakpoint
CREATE TABLE `game_skill_book_collections` (
	`character_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`completed` integer NOT NULL,
	CONSTRAINT `game_skill_book_collections_pk` PRIMARY KEY(`character_id`, `recipe_id`),
	CONSTRAINT `fk_game_skill_book_collections_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_skill_book_collections_check_0" CHECK(completed IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `game_skill_book_pages` (
	`character_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`position` integer NOT NULL,
	`page_id` text NOT NULL,
	CONSTRAINT `game_skill_book_pages_pk` PRIMARY KEY(`character_id`, `recipe_id`, `position`),
	CONSTRAINT `fk_game_skill_book_pages_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_skill_book_pages_character_id_recipe_id_game_skill_book_collections_character_id_recipe_id_fk` FOREIGN KEY (`character_id`,`recipe_id`) REFERENCES `game_skill_book_collections`(`character_id`,`recipe_id`) ON DELETE CASCADE,
	CONSTRAINT "game_skill_book_pages_check_0" CHECK(position BETWEEN 0 AND 19)
);
--> statement-breakpoint
CREATE TABLE `game_skill_objective_counts` (
	`character_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`objective_id` text NOT NULL,
	`count` integer NOT NULL,
	CONSTRAINT `game_skill_objective_counts_pk` PRIMARY KEY(`character_id`, `skill_id`, `objective_id`),
	CONSTRAINT `fk_game_skill_objective_counts_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_skill_objective_counts_character_id_skill_id_game_learned_skills_character_id_skill_id_fk` FOREIGN KEY (`character_id`,`skill_id`) REFERENCES `game_learned_skills`(`character_id`,`skill_id`) ON DELETE CASCADE,
	CONSTRAINT "game_skill_objective_counts_check_0" CHECK(count BETWEEN 0 AND 1000)
);
--> statement-breakpoint
CREATE TABLE `game_title_evidence` (
	`character_id` text NOT NULL,
	`evidence_id` text NOT NULL,
	`count` integer NOT NULL,
	CONSTRAINT `game_title_evidence_pk` PRIMARY KEY(`character_id`, `evidence_id`),
	CONSTRAINT `fk_game_title_evidence_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_title_evidence_check_0" CHECK(count BETWEEN 0 AND 1000000)
);
--> statement-breakpoint
CREATE TABLE `game_tracked_objectives` (
	`character_id` text NOT NULL,
	`position` integer NOT NULL,
	`quest_id` text NOT NULL,
	`objective_id` text NOT NULL,
	CONSTRAINT `game_tracked_objectives_pk` PRIMARY KEY(`character_id`, `position`),
	CONSTRAINT `fk_game_tracked_objectives_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_tracked_objectives_character_id_quest_id_game_quests_character_id_quest_id_fk` FOREIGN KEY (`character_id`,`quest_id`) REFERENCES `game_quests`(`character_id`,`quest_id`) ON DELETE CASCADE,
	CONSTRAINT "game_tracked_objectives_check_0" CHECK(position BETWEEN 0 AND 2)
);
--> statement-breakpoint
CREATE TABLE `game_world_flags` (
	`character_id` text NOT NULL,
	`kind` text NOT NULL,
	`object_id` text NOT NULL,
	`position` integer NOT NULL,
	CONSTRAINT `game_world_flags_pk` PRIMARY KEY(`character_id`, `kind`, `object_id`),
	CONSTRAINT `fk_game_world_flags_character_id_game_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `game_characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "game_world_flags_check_0" CHECK(kind IN ('opened','cleared')),
	CONSTRAINT "game_world_flags_check_1" CHECK(position >= 0)
);
--> statement-breakpoint
CREATE INDEX `game_characters_owner_idx` ON `game_characters` (`user_id`,`created_at`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `game_command_revision_idx` ON `game_command_receipts` (`character_id`,`committed_revision`);--> statement-breakpoint
CREATE INDEX `game_command_character_idx` ON `game_command_receipts` (`character_id`);--> statement-breakpoint
-- A receipt owns the whole batch: a stale candidate cannot modify any game rows.
CREATE TRIGGER game_command_revision_guard
BEFORE INSERT ON game_command_receipts
BEGIN
  SELECT RAISE(ABORT, 'game_command_conflict')
  WHERE NOT EXISTS (
    SELECT 1 FROM game_characters
    WHERE id = NEW.character_id AND user_id = NEW.user_id
      AND revision = NEW.base_revision
  );
END;
--> statement-breakpoint
CREATE TRIGGER game_command_advance_revision
AFTER INSERT ON game_command_receipts
BEGIN
  UPDATE game_characters
  SET revision = NEW.committed_revision, updated_at = NEW.created_at
  WHERE id = NEW.character_id;
END;
--> statement-breakpoint
-- Blueprints are immutable within a run. Replacing a run deletes its old row first.
CREATE TRIGGER game_dungeon_blueprint_immutable
BEFORE UPDATE OF blueprint ON game_dungeon_runs
WHEN NEW.blueprint != OLD.blueprint
BEGIN
  SELECT RAISE(ABORT, 'immutable_dungeon_blueprint');
END;
