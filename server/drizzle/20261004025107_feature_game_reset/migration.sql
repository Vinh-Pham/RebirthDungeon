-- Coordinated game reset. Authentication and audit history are preserved.
DROP TRIGGER IF EXISTS "game_command_revision_guard";
--> statement-breakpoint
DROP TRIGGER IF EXISTS "game_command_advance_revision";
--> statement-breakpoint
DROP TRIGGER IF EXISTS "game_dungeon_blueprint_immutable";
--> statement-breakpoint
DROP TRIGGER IF EXISTS "game_encounter_format_insert";
--> statement-breakpoint
DROP TRIGGER IF EXISTS "game_encounter_format_update";
--> statement-breakpoint
DELETE FROM game_characters;
--> statement-breakpoint
DROP TABLE "game_world_flags";
--> statement-breakpoint
DROP TABLE "game_tracked_objectives";
--> statement-breakpoint
DROP TABLE "game_title_evidence";
--> statement-breakpoint
DROP TABLE "game_skill_objective_counts";
--> statement-breakpoint
DROP TABLE "game_skill_book_pages";
--> statement-breakpoint
DROP TABLE "game_skill_book_collections";
--> statement-breakpoint
DROP TABLE "game_selected_titles";
--> statement-breakpoint
DROP TABLE "game_rng_streams";
--> statement-breakpoint
DROP TABLE "game_quest_objective_counts";
--> statement-breakpoint
DROP TABLE "game_quests";
--> statement-breakpoint
DROP TABLE "game_quest_flags";
--> statement-breakpoint
DROP TABLE "game_milestone_claims";
--> statement-breakpoint
DROP TABLE "game_loadouts";
--> statement-breakpoint
DROP TABLE "game_learned_skills";
--> statement-breakpoint
DROP TABLE "game_item_hotbar";
--> statement-breakpoint
DROP TABLE "game_inventory_stacks";
--> statement-breakpoint
DROP TABLE "game_heroes";
--> statement-breakpoint
DROP TABLE "game_equipment_enchant_values";
--> statement-breakpoint
DROP TABLE "game_equipment_enchants";
--> statement-breakpoint
DROP TABLE "game_equipment_instances";
--> statement-breakpoint
DROP TABLE "game_encounter_turn_order";
--> statement-breakpoint
DROP TABLE "game_encounter_training";
--> statement-breakpoint
DROP TABLE "game_encounter_statuses";
--> statement-breakpoint
DROP TABLE "game_encounter_stats";
--> statement-breakpoint
DROP TABLE "game_encounter_sources";
--> statement-breakpoint
DROP TABLE "game_encounter_skills";
--> statement-breakpoint
DROP TABLE "game_encounter_reward_items";
--> statement-breakpoint
DROP TABLE "game_encounter_rewards";
--> statement-breakpoint
DROP TABLE "game_encounter_quest_evidence";
--> statement-breakpoint
DROP TABLE "game_encounter_inventory";
--> statement-breakpoint
DROP TABLE "game_encounter_enemy_history";
--> statement-breakpoint
DROP TABLE "game_encounter_cooldowns";
--> statement-breakpoint
DROP TABLE "game_encounter_actor_values";
--> statement-breakpoint
DROP TABLE "game_encounter_actors";
--> statement-breakpoint
DROP TABLE "game_encounters";
--> statement-breakpoint
DROP TABLE "game_enchant_recovered_items";
--> statement-breakpoint
DROP TABLE "game_enchant_receipts";
--> statement-breakpoint
DROP TABLE "game_dungeon_keys";
--> statement-breakpoint
DROP TABLE "game_dungeon_flags";
--> statement-breakpoint
DROP TABLE "game_dungeon_effects";
--> statement-breakpoint
DROP TABLE "game_dungeon_runs";
--> statement-breakpoint
DROP TABLE "game_discovered_skills";
--> statement-breakpoint
DROP TABLE "game_command_receipts";
--> statement-breakpoint
DROP TABLE "game_character_titles";
--> statement-breakpoint
DROP TABLE "game_campaigns";
--> statement-breakpoint
DROP TABLE "game_characters";
--> statement-breakpoint
CREATE TABLE "game_content_releases" (
  "content_version" text PRIMARY KEY NOT NULL,
  "checksum" text NOT NULL,
  "schema_version" integer NOT NULL,
  "created_at" integer NOT NULL,
  "published" integer NOT NULL DEFAULT 0,
  CONSTRAINT "game_content_release_published" CHECK ("game_content_releases"."published" IN (0,1))
);
--> statement-breakpoint
CREATE TABLE "game_characters" (
  "id" text NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "talent" text NOT NULL,
  "age" integer NOT NULL,
  "revision" integer NOT NULL,
  "content_version" text NOT NULL,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version") REFERENCES "game_content_releases" ("content_version") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_characters_check_0" CHECK (talent IN ('warrior','archery','mage')),
  CONSTRAINT "game_characters_check_1" CHECK (age BETWEEN 10 AND 17),
  CONSTRAINT "game_characters_check_2" CHECK (revision >= 0),
  CONSTRAINT "game_characters_check_3" CHECK (length(trim(name)) BETWEEN 1 AND 24)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_character_content_idx" ON "game_characters" ("id","content_version");
--> statement-breakpoint
CREATE INDEX "game_characters_owner_idx" ON "game_characters" ("user_id","created_at","id");
--> statement-breakpoint
CREATE TABLE "game_content_atlases" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "id" text NOT NULL,
  "columns" integer NOT NULL,
  "rows" integer NOT NULL,
  "frame_width" integer NOT NULL,
  "frame_height" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position"),
  FOREIGN KEY ("content_version") REFERENCES "game_content_releases" ("content_version") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_atlases_check_0" CHECK ((columns IS NULL OR columns >= 1)),
  CONSTRAINT "game_content_atlases_check_1" CHECK ((columns IS NULL OR columns <= 9007199254740991)),
  CONSTRAINT "game_content_atlases_check_2" CHECK ((rows IS NULL OR rows >= 1)),
  CONSTRAINT "game_content_atlases_check_3" CHECK ((rows IS NULL OR rows <= 9007199254740991)),
  CONSTRAINT "game_content_atlases_check_4" CHECK ((frame_width IS NULL OR frame_width >= 1)),
  CONSTRAINT "game_content_atlases_check_5" CHECK ((frame_width IS NULL OR frame_width <= 9007199254740991)),
  CONSTRAINT "game_content_atlases_check_6" CHECK ((frame_height IS NULL OR frame_height >= 1)),
  CONSTRAINT "game_content_atlases_check_7" CHECK ((frame_height IS NULL OR frame_height <= 9007199254740991))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_content_atlases_definition_idx" ON "game_content_atlases" ("content_version","definition_id");
--> statement-breakpoint
CREATE TABLE "game_content_classes" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "max_health" integer NOT NULL,
  "max_mana" integer NOT NULL,
  "combatant_attack" integer NOT NULL,
  "combatant_defense" integer NOT NULL,
  "combatant_speed" integer NOT NULL,
  "combatant_min_damage" integer,
  "combatant_max_damage" integer,
  "combatant_balance" real,
  "combatant_magic_attack" integer,
  "combatant_magic_defense" integer,
  "combatant_protection" integer,
  "combatant_magic_protection" integer,
  "combatant_magic_balance" real,
  "combatant_magic_critical_chance" real,
  "combatant_critical_rating" real,
  "combatant_min_injury" real,
  "combatant_max_injury" real,
  "combatant_armor_pierce" integer,
  "combatant_hit_chance" real,
  "combatant_evasion" real,
  "combatant_critical_chance" real,
  "combatant_critical_multiplier" real,
  "max_stamina" integer,
  "sprite_atlas" text NOT NULL,
  "sprite_frame" integer NOT NULL,
  "sprite_idle_frames_present" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position"),
  FOREIGN KEY ("content_version") REFERENCES "game_content_releases" ("content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","sprite_atlas") REFERENCES "game_content_atlases" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_content_classes_check_0" CHECK ((max_health IS NULL OR max_health >= 1)),
  CONSTRAINT "game_content_classes_check_1" CHECK ((max_health IS NULL OR max_health <= 100000)),
  CONSTRAINT "game_content_classes_check_2" CHECK ((max_mana IS NULL OR max_mana >= 0)),
  CONSTRAINT "game_content_classes_check_3" CHECK ((max_mana IS NULL OR max_mana <= 100000)),
  CONSTRAINT "game_content_classes_check_4" CHECK ((combatant_attack IS NULL OR combatant_attack >= 0)),
  CONSTRAINT "game_content_classes_check_5" CHECK ((combatant_attack IS NULL OR combatant_attack <= 1000000)),
  CONSTRAINT "game_content_classes_check_6" CHECK ((combatant_defense IS NULL OR combatant_defense >= 0)),
  CONSTRAINT "game_content_classes_check_7" CHECK ((combatant_defense IS NULL OR combatant_defense <= 1000000)),
  CONSTRAINT "game_content_classes_check_8" CHECK ((combatant_speed IS NULL OR combatant_speed >= 0)),
  CONSTRAINT "game_content_classes_check_9" CHECK ((combatant_speed IS NULL OR combatant_speed <= 1000000)),
  CONSTRAINT "game_content_classes_check_10" CHECK ((combatant_min_damage IS NULL OR combatant_min_damage >= 0)),
  CONSTRAINT "game_content_classes_check_11" CHECK ((combatant_min_damage IS NULL OR combatant_min_damage <= 1000000)),
  CONSTRAINT "game_content_classes_check_12" CHECK ((combatant_max_damage IS NULL OR combatant_max_damage >= 0)),
  CONSTRAINT "game_content_classes_check_13" CHECK ((combatant_max_damage IS NULL OR combatant_max_damage <= 1000000)),
  CONSTRAINT "game_content_classes_check_14" CHECK ((combatant_balance IS NULL OR combatant_balance >= 0)),
  CONSTRAINT "game_content_classes_check_15" CHECK ((combatant_balance IS NULL OR combatant_balance <= 1)),
  CONSTRAINT "game_content_classes_check_16" CHECK ((combatant_magic_attack IS NULL OR combatant_magic_attack >= 0)),
  CONSTRAINT "game_content_classes_check_17" CHECK ((combatant_magic_attack IS NULL OR combatant_magic_attack <= 1000000)),
  CONSTRAINT "game_content_classes_check_18" CHECK ((combatant_magic_defense IS NULL OR combatant_magic_defense >= 0)),
  CONSTRAINT "game_content_classes_check_19" CHECK ((combatant_magic_defense IS NULL OR combatant_magic_defense <= 1000000)),
  CONSTRAINT "game_content_classes_check_20" CHECK ((combatant_protection IS NULL OR combatant_protection >= 0)),
  CONSTRAINT "game_content_classes_check_21" CHECK ((combatant_protection IS NULL OR combatant_protection <= 1000000)),
  CONSTRAINT "game_content_classes_check_22" CHECK ((combatant_magic_protection IS NULL OR combatant_magic_protection >= 0)),
  CONSTRAINT "game_content_classes_check_23" CHECK ((combatant_magic_protection IS NULL OR combatant_magic_protection <= 1000000)),
  CONSTRAINT "game_content_classes_check_24" CHECK ((combatant_magic_balance IS NULL OR combatant_magic_balance >= 0)),
  CONSTRAINT "game_content_classes_check_25" CHECK ((combatant_magic_balance IS NULL OR combatant_magic_balance <= 1)),
  CONSTRAINT "game_content_classes_check_26" CHECK ((combatant_magic_critical_chance IS NULL OR combatant_magic_critical_chance >= 0)),
  CONSTRAINT "game_content_classes_check_27" CHECK ((combatant_magic_critical_chance IS NULL OR combatant_magic_critical_chance <= 9.999)),
  CONSTRAINT "game_content_classes_check_28" CHECK ((combatant_critical_rating IS NULL OR combatant_critical_rating >= 0)),
  CONSTRAINT "game_content_classes_check_29" CHECK ((combatant_critical_rating IS NULL OR combatant_critical_rating <= 9.999)),
  CONSTRAINT "game_content_classes_check_30" CHECK ((combatant_min_injury IS NULL OR combatant_min_injury >= 0)),
  CONSTRAINT "game_content_classes_check_31" CHECK ((combatant_min_injury IS NULL OR combatant_min_injury <= 1)),
  CONSTRAINT "game_content_classes_check_32" CHECK ((combatant_max_injury IS NULL OR combatant_max_injury >= 0)),
  CONSTRAINT "game_content_classes_check_33" CHECK ((combatant_max_injury IS NULL OR combatant_max_injury <= 1)),
  CONSTRAINT "game_content_classes_check_34" CHECK ((combatant_armor_pierce IS NULL OR combatant_armor_pierce >= 0)),
  CONSTRAINT "game_content_classes_check_35" CHECK ((combatant_armor_pierce IS NULL OR combatant_armor_pierce <= 1000000)),
  CONSTRAINT "game_content_classes_check_36" CHECK ((combatant_hit_chance IS NULL OR combatant_hit_chance >= 0)),
  CONSTRAINT "game_content_classes_check_37" CHECK ((combatant_hit_chance IS NULL OR combatant_hit_chance <= 1)),
  CONSTRAINT "game_content_classes_check_38" CHECK ((combatant_evasion IS NULL OR combatant_evasion >= 0)),
  CONSTRAINT "game_content_classes_check_39" CHECK ((combatant_evasion IS NULL OR combatant_evasion <= 1)),
  CONSTRAINT "game_content_classes_check_40" CHECK ((combatant_critical_chance IS NULL OR combatant_critical_chance >= 0)),
  CONSTRAINT "game_content_classes_check_41" CHECK ((combatant_critical_chance IS NULL OR combatant_critical_chance <= 1)),
  CONSTRAINT "game_content_classes_check_42" CHECK ((combatant_critical_multiplier IS NULL OR combatant_critical_multiplier >= 1)),
  CONSTRAINT "game_content_classes_check_43" CHECK ((combatant_critical_multiplier IS NULL OR combatant_critical_multiplier <= 10)),
  CONSTRAINT "game_content_classes_check_44" CHECK ((max_stamina IS NULL OR max_stamina >= 0)),
  CONSTRAINT "game_content_classes_check_45" CHECK ((max_stamina IS NULL OR max_stamina <= 100000)),
  CONSTRAINT "game_content_classes_check_46" CHECK ((sprite_frame IS NULL OR sprite_frame >= 0)),
  CONSTRAINT "game_content_classes_check_47" CHECK ((sprite_frame IS NULL OR sprite_frame <= 9007199254740991)),
  CONSTRAINT "game_content_classes_check_48" CHECK ((sprite_idle_frames_present IS NULL OR sprite_idle_frames_present IN (0,1)))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_content_classes_definition_idx" ON "game_content_classes" ("content_version","definition_id");
--> statement-breakpoint
CREATE TABLE "game_heroes" (
  "content_version" text NOT NULL,
  "character_id" text NOT NULL,
  "class_id" text NOT NULL,
  "level" integer NOT NULL,
  "cumulative_level" integer NOT NULL,
  "experience" integer NOT NULL,
  "gold" integer NOT NULL,
  "ap" integer NOT NULL,
  PRIMARY KEY ("character_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","class_id") REFERENCES "game_content_classes" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_heroes_check_0" CHECK (level BETWEEN 1 AND 200),
  CONSTRAINT "game_heroes_check_1" CHECK (cumulative_level >= level),
  CONSTRAINT "game_heroes_check_2" CHECK (experience >= 0),
  CONSTRAINT "game_heroes_check_3" CHECK (gold BETWEEN 0 AND 1000000),
  CONSTRAINT "game_heroes_check_4" CHECK (ap BETWEEN 0 AND 1000000)
);
--> statement-breakpoint
CREATE TABLE "game_milestone_claims" (
  "character_id" text NOT NULL,
  "milestone_id" text NOT NULL,
  "position" integer NOT NULL,
  PRIMARY KEY ("character_id","milestone_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_milestone_claims_check_0" CHECK (milestone_id = 'intro-melee-lesson'),
  CONSTRAINT "game_milestone_claims_check_1" CHECK (position = 0)
);
--> statement-breakpoint
CREATE TABLE "game_resources" (
  "character_id" text NOT NULL,
  "health" integer NOT NULL,
  "mana" integer NOT NULL,
  "stamina" integer NOT NULL,
  "wounds" integer NOT NULL,
  "fullness_tenths" integer NOT NULL,
  PRIMARY KEY ("character_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_resources_check_5" CHECK (health >= 1),
  CONSTRAINT "game_resources_check_6" CHECK (mana >= 0),
  CONSTRAINT "game_resources_check_7" CHECK (stamina >= 0),
  CONSTRAINT "game_resources_check_8" CHECK (wounds >= 0),
  CONSTRAINT "game_resources_check_9" CHECK (fullness_tenths BETWEEN 500 AND 1000)
);
--> statement-breakpoint
CREATE TABLE "game_content_enchants" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "slot" text NOT NULL,
  "rank" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position"),
  FOREIGN KEY ("content_version") REFERENCES "game_content_releases" ("content_version") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_enchants_check_0" CHECK ((slot IS NULL OR slot IN ('prefix','suffix'))),
  CONSTRAINT "game_content_enchants_check_1" CHECK ((rank IS NULL OR rank IN ('1','2','3','4','5','6','7','8','9','F','E','D','C','B','A')))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_content_enchants_definition_idx" ON "game_content_enchants" ("content_version","definition_id");
--> statement-breakpoint
CREATE TABLE "game_content_status_effects" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "duration" integer NOT NULL,
  "tick_timing" text NOT NULL,
  "stacking" text NOT NULL,
  "effect" text NOT NULL,
  "health_fraction" real,
  "power" integer NOT NULL,
  "stat" text,
  "modifier" integer,
  PRIMARY KEY ("content_version","definition_id","position"),
  FOREIGN KEY ("content_version") REFERENCES "game_content_releases" ("content_version") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_status_effects_check_0" CHECK ((duration IS NULL OR duration >= 1)),
  CONSTRAINT "game_content_status_effects_check_1" CHECK ((duration IS NULL OR duration <= 100)),
  CONSTRAINT "game_content_status_effects_check_2" CHECK ((tick_timing IS NULL OR tick_timing IN ('turnStart','turnEnd'))),
  CONSTRAINT "game_content_status_effects_check_3" CHECK ((stacking IS NULL OR stacking IN ('refresh','stack','ignore'))),
  CONSTRAINT "game_content_status_effects_check_4" CHECK ((effect IS NULL OR effect IN ('damage','heal','stat','poison'))),
  CONSTRAINT "game_content_status_effects_check_5" CHECK ((health_fraction IS NULL OR health_fraction >= 0)),
  CONSTRAINT "game_content_status_effects_check_6" CHECK ((health_fraction IS NULL OR health_fraction <= 1)),
  CONSTRAINT "game_content_status_effects_check_7" CHECK ((power IS NULL OR power >= 0)),
  CONSTRAINT "game_content_status_effects_check_8" CHECK ((power IS NULL OR power <= 10000)),
  CONSTRAINT "game_content_status_effects_check_9" CHECK ((stat IS NULL OR stat IN ('attack','defense','speed'))),
  CONSTRAINT "game_content_status_effects_check_10" CHECK ((modifier IS NULL OR modifier >= -1000)),
  CONSTRAINT "game_content_status_effects_check_11" CHECK ((modifier IS NULL OR modifier <= 1000))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_content_status_effects_definition_idx" ON "game_content_status_effects" ("content_version","definition_id");
--> statement-breakpoint
CREATE TABLE "game_content_skills" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "mana_cost" integer NOT NULL,
  "power" integer NOT NULL,
  "element" text NOT NULL,
  "target" text NOT NULL,
  "effect" text,
  "statuses_present" integer NOT NULL,
  "hit_chance" real,
  "critical_chance" real,
  "stamina_cost" integer,
  "physical_multiplier" real,
  "bypass_defend" integer,
  "stat_bonuses_present" integer NOT NULL,
  "stat_bonuses_strength" real,
  "stat_bonuses_intelligence" real,
  "stat_bonuses_dexterity" real,
  "stat_bonuses_will" real,
  "stat_bonuses_luck" real,
  "min_power" integer,
  "max_power" integer,
  "min_magic_modifier" real,
  "max_magic_modifier" real,
  "category" text,
  "kind" text,
  "battle_usable" integer,
  "rank" text,
  "description" text,
  "reference" text,
  "game_ranks_present" integer NOT NULL,
  "requires_weapon" text,
  "acquisition_hint" text,
  "enemy_only" integer,
  "enemy_use_present" integer NOT NULL,
  "enemy_use_type" text,
  "enemy_use_status_id" text,
  "enemy_use_chance" real,
  PRIMARY KEY ("content_version","definition_id","position"),
  FOREIGN KEY ("content_version") REFERENCES "game_content_releases" ("content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","enemy_use_status_id") REFERENCES "game_content_status_effects" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_content_skills_check_0" CHECK ((mana_cost IS NULL OR mana_cost >= 0)),
  CONSTRAINT "game_content_skills_check_1" CHECK ((mana_cost IS NULL OR mana_cost <= 9007199254740991)),
  CONSTRAINT "game_content_skills_check_2" CHECK ((power IS NULL OR power >= 0)),
  CONSTRAINT "game_content_skills_check_3" CHECK ((power IS NULL OR power <= 1000000)),
  CONSTRAINT "game_content_skills_check_4" CHECK ((element IS NULL OR element IN ('physical','fire','ice','lightning'))),
  CONSTRAINT "game_content_skills_check_5" CHECK ((target IS NULL OR target IN ('self','ally','enemy','allEnemies'))),
  CONSTRAINT "game_content_skills_check_6" CHECK ((effect IS NULL OR effect IN ('damage','heal','buff'))),
  CONSTRAINT "game_content_skills_check_7" CHECK ((statuses_present IS NULL OR statuses_present IN (0,1))),
  CONSTRAINT "game_content_skills_check_8" CHECK ((hit_chance IS NULL OR hit_chance >= 0)),
  CONSTRAINT "game_content_skills_check_9" CHECK ((hit_chance IS NULL OR hit_chance <= 1)),
  CONSTRAINT "game_content_skills_check_10" CHECK ((critical_chance IS NULL OR critical_chance >= 0)),
  CONSTRAINT "game_content_skills_check_11" CHECK ((critical_chance IS NULL OR critical_chance <= 1)),
  CONSTRAINT "game_content_skills_check_12" CHECK ((stamina_cost IS NULL OR stamina_cost >= 0)),
  CONSTRAINT "game_content_skills_check_13" CHECK ((stamina_cost IS NULL OR stamina_cost <= 10000)),
  CONSTRAINT "game_content_skills_check_14" CHECK ((physical_multiplier IS NULL OR physical_multiplier >= 0)),
  CONSTRAINT "game_content_skills_check_15" CHECK ((physical_multiplier IS NULL OR physical_multiplier <= 10)),
  CONSTRAINT "game_content_skills_check_16" CHECK ((bypass_defend IS NULL OR bypass_defend IN (0,1))),
  CONSTRAINT "game_content_skills_check_17" CHECK ((stat_bonuses_present IS NULL OR stat_bonuses_present IN (0,1))),
  CONSTRAINT "game_content_skills_check_18" CHECK ((stat_bonuses_strength IS NULL OR stat_bonuses_strength >= -1500)),
  CONSTRAINT "game_content_skills_check_19" CHECK ((stat_bonuses_strength IS NULL OR stat_bonuses_strength <= 1500)),
  CONSTRAINT "game_content_skills_check_20" CHECK ((stat_bonuses_intelligence IS NULL OR stat_bonuses_intelligence >= -1500)),
  CONSTRAINT "game_content_skills_check_21" CHECK ((stat_bonuses_intelligence IS NULL OR stat_bonuses_intelligence <= 1500)),
  CONSTRAINT "game_content_skills_check_22" CHECK ((stat_bonuses_dexterity IS NULL OR stat_bonuses_dexterity >= -1500)),
  CONSTRAINT "game_content_skills_check_23" CHECK ((stat_bonuses_dexterity IS NULL OR stat_bonuses_dexterity <= 1500)),
  CONSTRAINT "game_content_skills_check_24" CHECK ((stat_bonuses_will IS NULL OR stat_bonuses_will >= -1500)),
  CONSTRAINT "game_content_skills_check_25" CHECK ((stat_bonuses_will IS NULL OR stat_bonuses_will <= 1500)),
  CONSTRAINT "game_content_skills_check_26" CHECK ((stat_bonuses_luck IS NULL OR stat_bonuses_luck >= -1500)),
  CONSTRAINT "game_content_skills_check_27" CHECK ((stat_bonuses_luck IS NULL OR stat_bonuses_luck <= 1500)),
  CONSTRAINT "game_content_skills_check_28" CHECK ((min_power IS NULL OR min_power >= 0)),
  CONSTRAINT "game_content_skills_check_29" CHECK ((min_power IS NULL OR min_power <= 1000000)),
  CONSTRAINT "game_content_skills_check_30" CHECK ((max_power IS NULL OR max_power >= 0)),
  CONSTRAINT "game_content_skills_check_31" CHECK ((max_power IS NULL OR max_power <= 1000000)),
  CONSTRAINT "game_content_skills_check_32" CHECK ((min_magic_modifier IS NULL OR min_magic_modifier >= 0)),
  CONSTRAINT "game_content_skills_check_33" CHECK ((min_magic_modifier IS NULL OR min_magic_modifier <= 10)),
  CONSTRAINT "game_content_skills_check_34" CHECK ((max_magic_modifier IS NULL OR max_magic_modifier >= 0)),
  CONSTRAINT "game_content_skills_check_35" CHECK ((max_magic_modifier IS NULL OR max_magic_modifier <= 10)),
  CONSTRAINT "game_content_skills_check_36" CHECK ((category IS NULL OR category IN ('combat','magic','life'))),
  CONSTRAINT "game_content_skills_check_37" CHECK ((kind IS NULL OR kind IN ('active','passive','life'))),
  CONSTRAINT "game_content_skills_check_38" CHECK ((battle_usable IS NULL OR battle_usable IN (0,1))),
  CONSTRAINT "game_content_skills_check_39" CHECK ((rank IS NULL OR rank IN ('1','2','3','4','5','6','7','8','9','F','E','D','C','B','A'))),
  CONSTRAINT "game_content_skills_check_40" CHECK ((reference IS NULL OR json_valid(reference))),
  CONSTRAINT "game_content_skills_check_41" CHECK ((game_ranks_present IS NULL OR game_ranks_present IN (0,1))),
  CONSTRAINT "game_content_skills_check_42" CHECK ((requires_weapon IS NULL OR requires_weapon IN ('melee','sword'))),
  CONSTRAINT "game_content_skills_check_43" CHECK ((enemy_only IS NULL OR enemy_only IN (0,1))),
  CONSTRAINT "game_content_skills_check_44" CHECK ((enemy_use_present IS NULL OR enemy_use_present IN (0,1))),
  CONSTRAINT "game_content_skills_check_45" CHECK ((enemy_use_chance IS NULL OR enemy_use_chance >= 0)),
  CONSTRAINT "game_content_skills_check_46" CHECK ((enemy_use_chance IS NULL OR enemy_use_chance <= 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_content_skills_definition_idx" ON "game_content_skills" ("content_version","definition_id");
--> statement-breakpoint
CREATE TABLE "game_content_titles" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "slot" text NOT NULL,
  "category" text,
  "spoiler" text,
  "hint" text,
  "award" text,
  "discovery_first" integer,
  "eligibility_present" integer NOT NULL,
  "eligibility_skill_id" text,
  "eligibility_rank" text,
  "effects_present" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position"),
  FOREIGN KEY ("content_version") REFERENCES "game_content_releases" ("content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","eligibility_skill_id") REFERENCES "game_content_skills" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_content_titles_check_0" CHECK ((slot IS NULL OR slot IN ('first','second'))),
  CONSTRAINT "game_content_titles_check_1" CHECK ((category IS NULL OR category IN ('General','Story','Combat','Master','Event'))),
  CONSTRAINT "game_content_titles_check_2" CHECK ((spoiler IS NULL OR spoiler IN ('hidden','placeholder'))),
  CONSTRAINT "game_content_titles_check_3" CHECK ((hint IS NULL OR json_valid(hint))),
  CONSTRAINT "game_content_titles_check_4" CHECK ((award IS NULL OR json_valid(award))),
  CONSTRAINT "game_content_titles_check_5" CHECK ((discovery_first IS NULL OR discovery_first IN (0,1))),
  CONSTRAINT "game_content_titles_check_6" CHECK ((eligibility_present IS NULL OR eligibility_present IN (0,1))),
  CONSTRAINT "game_content_titles_check_7" CHECK ((eligibility_rank IS NULL OR eligibility_rank IN ('1','2','3','4','5','6','7','8','9','F','E','D','C','B','A'))),
  CONSTRAINT "game_content_titles_check_8" CHECK ((effects_present IS NULL OR effects_present IN (0,1)))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_content_titles_definition_idx" ON "game_content_titles" ("content_version","definition_id");
--> statement-breakpoint
CREATE TABLE "game_content_skill_book_recipes" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "id" text NOT NULL,
  "skill_id" text NOT NULL,
  "incomplete_item_id" text NOT NULL,
  "complete_item_id" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position"),
  FOREIGN KEY ("content_version") REFERENCES "game_content_releases" ("content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","skill_id") REFERENCES "game_content_skills" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","incomplete_item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","complete_item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_content_skill_book_recipes_definition_idx" ON "game_content_skill_book_recipes" ("content_version","definition_id");
--> statement-breakpoint
CREATE TABLE "game_content_items" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "kind" text NOT NULL,
  "enchant_id" text,
  "title_id" text,
  "price" integer NOT NULL,
  "power" integer NOT NULL,
  "description" text NOT NULL,
  "weapon_tags_present" integer NOT NULL,
  "skill_id" text,
  "recipe_id" text,
  "stat" text,
  "max_durability" integer,
  "restores" text,
  "battle_usable" integer,
  "weapon_stats_present" integer NOT NULL,
  "weapon_stats_min_damage" integer,
  "weapon_stats_max_damage" integer,
  "weapon_stats_balance" real,
  "weapon_stats_critical" real,
  "weapon_stats_min_injury" real,
  "weapon_stats_max_injury" real,
  "protection" integer,
  "magic_defense" integer,
  "magic_protection" integer,
  "stat_bonuses_present" integer NOT NULL,
  "stat_bonuses_strength" real,
  "stat_bonuses_intelligence" real,
  "stat_bonuses_dexterity" real,
  "stat_bonuses_will" real,
  "stat_bonuses_luck" real,
  "stamina_recovery" integer,
  "fullness_recovery" real,
  PRIMARY KEY ("content_version","definition_id","position"),
  FOREIGN KEY ("content_version") REFERENCES "game_content_releases" ("content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","enchant_id") REFERENCES "game_content_enchants" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","title_id") REFERENCES "game_content_titles" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","skill_id") REFERENCES "game_content_skills" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","recipe_id") REFERENCES "game_content_skill_book_recipes" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_content_items_check_0" CHECK ((kind IS NULL OR kind IN ('consumable','weapon','armor','skillBook','incompleteBook','skillPage','enchantScroll','material','ammunition','titleCoupon'))),
  CONSTRAINT "game_content_items_check_1" CHECK ((price IS NULL OR price >= 0)),
  CONSTRAINT "game_content_items_check_2" CHECK ((price IS NULL OR price <= 100000)),
  CONSTRAINT "game_content_items_check_3" CHECK ((power IS NULL OR power >= 0)),
  CONSTRAINT "game_content_items_check_4" CHECK ((power IS NULL OR power <= 10000)),
  CONSTRAINT "game_content_items_check_5" CHECK ((weapon_tags_present IS NULL OR weapon_tags_present IN (0,1))),
  CONSTRAINT "game_content_items_check_6" CHECK ((stat IS NULL OR stat IN ('attack','defense','speed'))),
  CONSTRAINT "game_content_items_check_7" CHECK ((max_durability IS NULL OR max_durability >= 1)),
  CONSTRAINT "game_content_items_check_8" CHECK ((max_durability IS NULL OR max_durability <= 10000)),
  CONSTRAINT "game_content_items_check_9" CHECK ((restores IS NULL OR restores IN ('health','mana','stamina'))),
  CONSTRAINT "game_content_items_check_10" CHECK ((battle_usable IS NULL OR battle_usable IN (0,1))),
  CONSTRAINT "game_content_items_check_11" CHECK ((weapon_stats_present IS NULL OR weapon_stats_present IN (0,1))),
  CONSTRAINT "game_content_items_check_12" CHECK ((weapon_stats_min_damage IS NULL OR weapon_stats_min_damage >= 0)),
  CONSTRAINT "game_content_items_check_13" CHECK ((weapon_stats_min_damage IS NULL OR weapon_stats_min_damage <= 10000)),
  CONSTRAINT "game_content_items_check_14" CHECK ((weapon_stats_max_damage IS NULL OR weapon_stats_max_damage >= 0)),
  CONSTRAINT "game_content_items_check_15" CHECK ((weapon_stats_max_damage IS NULL OR weapon_stats_max_damage <= 10000)),
  CONSTRAINT "game_content_items_check_16" CHECK ((weapon_stats_balance IS NULL OR weapon_stats_balance >= 0)),
  CONSTRAINT "game_content_items_check_17" CHECK ((weapon_stats_balance IS NULL OR weapon_stats_balance <= 1)),
  CONSTRAINT "game_content_items_check_18" CHECK ((weapon_stats_critical IS NULL OR weapon_stats_critical >= 0)),
  CONSTRAINT "game_content_items_check_19" CHECK ((weapon_stats_critical IS NULL OR weapon_stats_critical <= 1)),
  CONSTRAINT "game_content_items_check_20" CHECK ((weapon_stats_min_injury IS NULL OR weapon_stats_min_injury >= 0)),
  CONSTRAINT "game_content_items_check_21" CHECK ((weapon_stats_min_injury IS NULL OR weapon_stats_min_injury <= 1)),
  CONSTRAINT "game_content_items_check_22" CHECK ((weapon_stats_max_injury IS NULL OR weapon_stats_max_injury >= 0)),
  CONSTRAINT "game_content_items_check_23" CHECK ((weapon_stats_max_injury IS NULL OR weapon_stats_max_injury <= 1)),
  CONSTRAINT "game_content_items_check_24" CHECK ((protection IS NULL OR protection >= 0)),
  CONSTRAINT "game_content_items_check_25" CHECK ((protection IS NULL OR protection <= 10000)),
  CONSTRAINT "game_content_items_check_26" CHECK ((magic_defense IS NULL OR magic_defense >= 0)),
  CONSTRAINT "game_content_items_check_27" CHECK ((magic_defense IS NULL OR magic_defense <= 10000)),
  CONSTRAINT "game_content_items_check_28" CHECK ((magic_protection IS NULL OR magic_protection >= 0)),
  CONSTRAINT "game_content_items_check_29" CHECK ((magic_protection IS NULL OR magic_protection <= 10000)),
  CONSTRAINT "game_content_items_check_30" CHECK ((stat_bonuses_present IS NULL OR stat_bonuses_present IN (0,1))),
  CONSTRAINT "game_content_items_check_31" CHECK ((stat_bonuses_strength IS NULL OR stat_bonuses_strength >= -1500)),
  CONSTRAINT "game_content_items_check_32" CHECK ((stat_bonuses_strength IS NULL OR stat_bonuses_strength <= 1500)),
  CONSTRAINT "game_content_items_check_33" CHECK ((stat_bonuses_intelligence IS NULL OR stat_bonuses_intelligence >= -1500)),
  CONSTRAINT "game_content_items_check_34" CHECK ((stat_bonuses_intelligence IS NULL OR stat_bonuses_intelligence <= 1500)),
  CONSTRAINT "game_content_items_check_35" CHECK ((stat_bonuses_dexterity IS NULL OR stat_bonuses_dexterity >= -1500)),
  CONSTRAINT "game_content_items_check_36" CHECK ((stat_bonuses_dexterity IS NULL OR stat_bonuses_dexterity <= 1500)),
  CONSTRAINT "game_content_items_check_37" CHECK ((stat_bonuses_will IS NULL OR stat_bonuses_will >= -1500)),
  CONSTRAINT "game_content_items_check_38" CHECK ((stat_bonuses_will IS NULL OR stat_bonuses_will <= 1500)),
  CONSTRAINT "game_content_items_check_39" CHECK ((stat_bonuses_luck IS NULL OR stat_bonuses_luck >= -1500)),
  CONSTRAINT "game_content_items_check_40" CHECK ((stat_bonuses_luck IS NULL OR stat_bonuses_luck <= 1500)),
  CONSTRAINT "game_content_items_check_41" CHECK ((stamina_recovery IS NULL OR stamina_recovery >= 0)),
  CONSTRAINT "game_content_items_check_42" CHECK ((stamina_recovery IS NULL OR stamina_recovery <= 10000)),
  CONSTRAINT "game_content_items_check_43" CHECK ((fullness_recovery IS NULL OR fullness_recovery >= 0)),
  CONSTRAINT "game_content_items_check_44" CHECK ((fullness_recovery IS NULL OR fullness_recovery <= 50))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_content_items_definition_idx" ON "game_content_items" ("content_version","definition_id");
--> statement-breakpoint
CREATE TABLE "game_equipment_instances" (
  "content_version" text NOT NULL,
  "character_id" text NOT NULL,
  "instance_id" text NOT NULL,
  "definition_id" text NOT NULL,
  "kind" text NOT NULL,
  "durability" integer,
  "locked" integer,
  PRIMARY KEY ("character_id","instance_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","definition_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_equipment_instances_check_0" CHECK (kind IN ('weapon','armor')),
  CONSTRAINT "game_equipment_instances_check_1" CHECK ((kind = 'weapon' AND durability BETWEEN 0 AND 10000) OR (kind = 'armor' AND durability IS NULL)),
  CONSTRAINT "game_equipment_instances_check_2" CHECK (locked IS NULL OR locked IN (0,1))
);
--> statement-breakpoint
CREATE TABLE "game_equipment_enchants" (
  "content_version" text NOT NULL,
  "character_id" text NOT NULL,
  "instance_id" text NOT NULL,
  "slot" text NOT NULL,
  "enchant_id" text NOT NULL,
  PRIMARY KEY ("character_id","instance_id","slot"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","enchant_id") REFERENCES "game_content_enchants" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("character_id","instance_id") REFERENCES "game_equipment_instances" ("character_id","instance_id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_equipment_enchants_check_0" CHECK (slot IN ('prefix','suffix'))
);
--> statement-breakpoint
CREATE TABLE "game_equipment_enchant_values" (
  "character_id" text NOT NULL,
  "instance_id" text NOT NULL,
  "slot" text NOT NULL,
  "stat_id" text NOT NULL,
  "value" integer NOT NULL,
  PRIMARY KEY ("character_id","instance_id","slot","stat_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","instance_id","slot") REFERENCES "game_equipment_enchants" ("character_id","instance_id","slot") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_equipment_enchant_values_check_0" CHECK (value BETWEEN -1000 AND 1000)
);
--> statement-breakpoint
CREATE TABLE "game_inventory_metadata" (
  "character_id" text NOT NULL,
  "next_weapon_id" integer NOT NULL,
  "next_armor_id" integer NOT NULL,
  PRIMARY KEY ("character_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_inventory_metadata_check_10" CHECK (next_weapon_id >= 1),
  CONSTRAINT "game_inventory_metadata_check_11" CHECK (next_armor_id >= 1)
);
--> statement-breakpoint
CREATE TABLE "game_inventory_stacks" (
  "content_version" text NOT NULL,
  "character_id" text NOT NULL,
  "item_id" text NOT NULL,
  "quantity" integer NOT NULL,
  PRIMARY KEY ("character_id","item_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_inventory_stacks_check_0" CHECK (quantity BETWEEN 1 AND 999)
);
--> statement-breakpoint
CREATE TABLE "game_item_hotbar" (
  "content_version" text NOT NULL,
  "character_id" text NOT NULL,
  "position" integer NOT NULL,
  "item_id" text NOT NULL,
  PRIMARY KEY ("character_id","position"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_item_hotbar_check_0" CHECK (position BETWEEN 0 AND 99)
);
--> statement-breakpoint
CREATE TABLE "game_loadouts" (
  "character_id" text NOT NULL,
  "weapon_id" text,
  "armor_id" text,
  "ammunition_id" text,
  PRIMARY KEY ("character_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","weapon_id") REFERENCES "game_equipment_instances" ("character_id","instance_id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","armor_id") REFERENCES "game_equipment_instances" ("character_id","instance_id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","ammunition_id") REFERENCES "game_inventory_stacks" ("character_id","item_id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "game_character_skills" (
  "content_version" text NOT NULL,
  "character_id" text NOT NULL,
  "skill_id" text NOT NULL,
  "rank" text,
  "position" integer,
  PRIMARY KEY ("character_id","skill_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","skill_id") REFERENCES "game_content_skills" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_character_skills_order_check" CHECK (position IS NULL OR position BETWEEN 0 AND 999),
  CONSTRAINT "game_character_skills_check_0" CHECK (rank IS NULL OR rank IN ('F','E','D','C','B','A','9','8','7','6','5','4','3','2','1'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_character_skills_discovery_idx" ON "game_character_skills" ("character_id","position");
--> statement-breakpoint
CREATE TABLE "game_skill_book_collections" (
  "content_version" text NOT NULL,
  "character_id" text NOT NULL,
  "recipe_id" text NOT NULL,
  "completed" integer NOT NULL,
  PRIMARY KEY ("character_id","recipe_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","recipe_id") REFERENCES "game_content_skill_book_recipes" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_skill_book_collections_check_0" CHECK (completed IN (0,1))
);
--> statement-breakpoint
CREATE TABLE "game_skill_book_pages" (
  "content_version" text NOT NULL,
  "character_id" text NOT NULL,
  "recipe_id" text NOT NULL,
  "position" integer NOT NULL,
  "page_id" text NOT NULL,
  PRIMARY KEY ("character_id","recipe_id","position"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","page_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("character_id","recipe_id") REFERENCES "game_skill_book_collections" ("character_id","recipe_id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_skill_book_pages_check_0" CHECK (position BETWEEN 0 AND 19)
);
--> statement-breakpoint
CREATE TABLE "game_skill_objective_counts" (
  "character_id" text NOT NULL,
  "skill_id" text NOT NULL,
  "objective_id" text NOT NULL,
  "count" integer NOT NULL,
  PRIMARY KEY ("character_id","skill_id","objective_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","skill_id") REFERENCES "game_character_skills" ("character_id","skill_id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_skill_objective_counts_check_0" CHECK (count BETWEEN 0 AND 1000)
);
--> statement-breakpoint
CREATE TABLE "game_content_quest_flags" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "value" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position"),
  FOREIGN KEY ("content_version") REFERENCES "game_content_releases" ("content_version") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_content_quest_flags_definition_idx" ON "game_content_quest_flags" ("content_version","definition_id");
--> statement-breakpoint
CREATE TABLE "game_quest_flags" (
  "content_version" text NOT NULL,
  "character_id" text NOT NULL,
  "flag_id" text NOT NULL,
  "position" integer NOT NULL,
  PRIMARY KEY ("character_id","flag_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","flag_id") REFERENCES "game_content_quest_flags" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_quest_flags_check_0" CHECK (position BETWEEN 0 AND 999)
);
--> statement-breakpoint
CREATE TABLE "game_content_worlds" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "width" integer NOT NULL,
  "height" integer NOT NULL,
  "tile_size" integer NOT NULL,
  "tiles" text NOT NULL,
  "entry_x" integer NOT NULL,
  "entry_y" integer NOT NULL,
  "theme" text,
  "decorations_present" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position"),
  FOREIGN KEY ("content_version") REFERENCES "game_content_releases" ("content_version") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_worlds_check_0" CHECK ((width IS NULL OR width >= 3)),
  CONSTRAINT "game_content_worlds_check_1" CHECK ((width IS NULL OR width <= 128)),
  CONSTRAINT "game_content_worlds_check_2" CHECK ((height IS NULL OR height >= 3)),
  CONSTRAINT "game_content_worlds_check_3" CHECK ((height IS NULL OR height <= 128)),
  CONSTRAINT "game_content_worlds_check_4" CHECK ((tile_size IS NULL OR tile_size >= 16)),
  CONSTRAINT "game_content_worlds_check_5" CHECK ((tile_size IS NULL OR tile_size <= 128)),
  CONSTRAINT "game_content_worlds_check_6" CHECK ((tiles IS NULL OR json_valid(tiles))),
  CONSTRAINT "game_content_worlds_check_7" CHECK ((entry_x IS NULL OR entry_x >= 0)),
  CONSTRAINT "game_content_worlds_check_8" CHECK ((entry_x IS NULL OR entry_x <= 9007199254740991)),
  CONSTRAINT "game_content_worlds_check_9" CHECK ((entry_y IS NULL OR entry_y >= 0)),
  CONSTRAINT "game_content_worlds_check_10" CHECK ((entry_y IS NULL OR entry_y <= 9007199254740991)),
  CONSTRAINT "game_content_worlds_check_11" CHECK ((theme IS NULL OR theme IN ('town','interior'))),
  CONSTRAINT "game_content_worlds_check_12" CHECK ((decorations_present IS NULL OR decorations_present IN (0,1)))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_content_worlds_definition_idx" ON "game_content_worlds" ("content_version","definition_id");
--> statement-breakpoint
CREATE TABLE "game_content_quests" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "category" text NOT NULL,
  "chapter_present" integer NOT NULL,
  "chapter_id" text,
  "chapter_name" text,
  "generation_present" integer NOT NULL,
  "generation_id" text,
  "generation_name" text,
  "delivery" text NOT NULL,
  "offer_npc_present" integer NOT NULL,
  "offer_npc_world_id" text,
  "offer_npc_object_id" text,
  "claim_npc_present" integer NOT NULL,
  "claim_npc_world_id" text,
  "claim_npc_object_id" text,
  "prerequisite" text,
  "rewards_experience" integer,
  "rewards_gold" integer,
  "rewards_ap" integer,
  "rewards_items_present" integer NOT NULL,
  "rewards_skills_present" integer NOT NULL,
  "rewards_titles_present" integer NOT NULL,
  "rewards_flags_present" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position"),
  FOREIGN KEY ("content_version") REFERENCES "game_content_releases" ("content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","offer_npc_world_id") REFERENCES "game_content_worlds" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","claim_npc_world_id") REFERENCES "game_content_worlds" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_content_quests_check_0" CHECK ((category IS NULL OR category IN ('mainstream','sidequest','skill'))),
  CONSTRAINT "game_content_quests_check_1" CHECK ((chapter_present IS NULL OR chapter_present IN (0,1))),
  CONSTRAINT "game_content_quests_check_2" CHECK ((generation_present IS NULL OR generation_present IN (0,1))),
  CONSTRAINT "game_content_quests_check_3" CHECK ((delivery IS NULL OR delivery IN ('automatic','npc'))),
  CONSTRAINT "game_content_quests_check_4" CHECK ((offer_npc_present IS NULL OR offer_npc_present IN (0,1))),
  CONSTRAINT "game_content_quests_check_5" CHECK ((claim_npc_present IS NULL OR claim_npc_present IN (0,1))),
  CONSTRAINT "game_content_quests_check_6" CHECK ((prerequisite IS NULL OR json_valid(prerequisite))),
  CONSTRAINT "game_content_quests_check_7" CHECK ((rewards_experience IS NULL OR rewards_experience >= 0)),
  CONSTRAINT "game_content_quests_check_8" CHECK ((rewards_experience IS NULL OR rewards_experience <= 1000000)),
  CONSTRAINT "game_content_quests_check_9" CHECK ((rewards_gold IS NULL OR rewards_gold >= 0)),
  CONSTRAINT "game_content_quests_check_10" CHECK ((rewards_gold IS NULL OR rewards_gold <= 1000000)),
  CONSTRAINT "game_content_quests_check_11" CHECK ((rewards_ap IS NULL OR rewards_ap >= 0)),
  CONSTRAINT "game_content_quests_check_12" CHECK ((rewards_ap IS NULL OR rewards_ap <= 1000000)),
  CONSTRAINT "game_content_quests_check_13" CHECK ((rewards_items_present IS NULL OR rewards_items_present IN (0,1))),
  CONSTRAINT "game_content_quests_check_14" CHECK ((rewards_skills_present IS NULL OR rewards_skills_present IN (0,1))),
  CONSTRAINT "game_content_quests_check_15" CHECK ((rewards_titles_present IS NULL OR rewards_titles_present IN (0,1))),
  CONSTRAINT "game_content_quests_check_16" CHECK ((rewards_flags_present IS NULL OR rewards_flags_present IN (0,1)))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_content_quests_definition_idx" ON "game_content_quests" ("content_version","definition_id");
--> statement-breakpoint
CREATE TABLE "game_quests" (
  "content_version" text NOT NULL,
  "character_id" text NOT NULL,
  "quest_id" text NOT NULL,
  "status" text NOT NULL,
  "stage_id" text NOT NULL,
  "claim_id" text,
  PRIMARY KEY ("character_id","quest_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","quest_id") REFERENCES "game_content_quests" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_quests_check_0" CHECK (status IN ('available','active','completed'))
);
--> statement-breakpoint
CREATE TABLE "game_quest_objective_counts" (
  "character_id" text NOT NULL,
  "quest_id" text NOT NULL,
  "objective_id" text NOT NULL,
  "count" integer NOT NULL,
  PRIMARY KEY ("character_id","quest_id","objective_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","quest_id") REFERENCES "game_quests" ("character_id","quest_id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_quest_objective_counts_check_0" CHECK (count BETWEEN 0 AND 999)
);
--> statement-breakpoint
CREATE TABLE "game_tracked_objectives" (
  "character_id" text NOT NULL,
  "position" integer NOT NULL,
  "quest_id" text NOT NULL,
  "objective_id" text NOT NULL,
  PRIMARY KEY ("character_id","position"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","quest_id") REFERENCES "game_quests" ("character_id","quest_id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_tracked_objectives_check_0" CHECK (position BETWEEN 0 AND 2)
);
--> statement-breakpoint
CREATE TABLE "game_character_titles" (
  "content_version" text NOT NULL,
  "character_id" text NOT NULL,
  "title_id" text NOT NULL,
  "discovered_position" integer,
  "earned_position" integer,
  "source" text,
  PRIMARY KEY ("character_id","title_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","title_id") REFERENCES "game_content_titles" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_character_titles_check_0" CHECK (discovered_position IS NULL OR discovered_position BETWEEN 0 AND 999),
  CONSTRAINT "game_character_titles_check_1" CHECK (earned_position IS NULL OR earned_position BETWEEN 0 AND 999)
);
--> statement-breakpoint
CREATE TABLE "game_selected_titles" (
  "character_id" text NOT NULL,
  "slot" text NOT NULL,
  "title_id" text NOT NULL,
  PRIMARY KEY ("character_id","slot"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","title_id") REFERENCES "game_character_titles" ("character_id","title_id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_selected_titles_check_0" CHECK (slot IN ('first','second'))
);
--> statement-breakpoint
CREATE TABLE "game_title_evidence" (
  "character_id" text NOT NULL,
  "evidence_id" text NOT NULL,
  "count" integer NOT NULL,
  PRIMARY KEY ("character_id","evidence_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_title_evidence_check_0" CHECK (count BETWEEN 0 AND 1000000)
);
--> statement-breakpoint
CREATE TABLE "game_enchant_receipts" (
  "character_id" text NOT NULL,
  "operation_id" text NOT NULL,
  "position" integer NOT NULL,
  "kind" text NOT NULL,
  "message" text NOT NULL,
  "success" integer NOT NULL,
  PRIMARY KEY ("character_id","operation_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_enchant_receipts_check_0" CHECK (position BETWEEN 0 AND 99),
  CONSTRAINT "game_enchant_receipts_check_1" CHECK (kind IN ('apply','burn')),
  CONSTRAINT "game_enchant_receipts_check_2" CHECK (success IN (0,1))
);
--> statement-breakpoint
CREATE TABLE "game_enchant_recovered_items" (
  "content_version" text NOT NULL,
  "character_id" text NOT NULL,
  "operation_id" text NOT NULL,
  "position" integer NOT NULL,
  "item_id" text NOT NULL,
  PRIMARY KEY ("character_id","operation_id","position"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("character_id","operation_id") REFERENCES "game_enchant_receipts" ("character_id","operation_id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_enchant_recovered_items_check_0" CHECK (position BETWEEN 0 AND 1)
);
--> statement-breakpoint
CREATE TABLE "game_rng_streams" (
  "character_id" text NOT NULL,
  "kind" text NOT NULL,
  "seed" integer NOT NULL,
  "algorithm" text NOT NULL,
  "version" integer NOT NULL,
  "word0" integer NOT NULL,
  "word1" integer NOT NULL,
  "word2" integer NOT NULL,
  "word3" integer NOT NULL,
  "next_operation_id" integer,
  PRIMARY KEY ("character_id","kind"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_rng_streams_check_0" CHECK (kind IN ('journey','enchant')),
  CONSTRAINT "game_rng_streams_check_1" CHECK (algorithm = 'xoroshiro128plus'),
  CONSTRAINT "game_rng_streams_check_2" CHECK (version = 1),
  CONSTRAINT "game_rng_streams_check_3" CHECK (word0 != 0 OR word1 != 0 OR word2 != 0 OR word3 != 0)
);
--> statement-breakpoint
CREATE TABLE "game_campaigns" (
  "content_version" text NOT NULL,
  "world_definition_id" text,
  "character_id" text NOT NULL,
  "world_id" text NOT NULL,
  "x" integer NOT NULL,
  "y" integer NOT NULL,
  "encounter_count" integer NOT NULL,
  "active_service" text,
  PRIMARY KEY ("character_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","world_definition_id") REFERENCES "game_content_worlds" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_campaigns_check_0" CHECK (x >= 0),
  CONSTRAINT "game_campaigns_check_1" CHECK (y >= 0),
  CONSTRAINT "game_campaigns_check_2" CHECK (encounter_count BETWEEN 0 AND 1000000)
);
--> statement-breakpoint
CREATE TABLE "game_rest_state" (
  "character_id" text NOT NULL,
  "resting" integer NOT NULL,
  "last_rest_tick" integer,
  "rest_lease_until" integer,
  PRIMARY KEY ("character_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_rest_state_posture" CHECK (resting IN (0,1))
);
--> statement-breakpoint
CREATE TABLE "game_world_flags" (
  "character_id" text NOT NULL,
  "kind" text NOT NULL,
  "object_id" text NOT NULL,
  "position" integer NOT NULL,
  PRIMARY KEY ("character_id","kind","object_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_world_flags_check_0" CHECK (kind IN ('opened','cleared')),
  CONSTRAINT "game_world_flags_check_1" CHECK (position >= 0)
);
--> statement-breakpoint
CREATE TABLE "game_content_dungeons" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "min_rooms" integer NOT NULL,
  "max_rooms" integer NOT NULL,
  "room_weights_monster" real NOT NULL,
  "room_weights_chest" real NOT NULL,
  "room_weights_mimic" real NOT NULL,
  "room_weights_fountain" real NOT NULL,
  "mimic_id" text NOT NULL,
  "boss_id" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position"),
  FOREIGN KEY ("content_version") REFERENCES "game_content_releases" ("content_version") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_dungeons_check_0" CHECK ((min_rooms IS NULL OR min_rooms >= 4)),
  CONSTRAINT "game_content_dungeons_check_1" CHECK ((min_rooms IS NULL OR min_rooms <= 12)),
  CONSTRAINT "game_content_dungeons_check_2" CHECK ((max_rooms IS NULL OR max_rooms >= 4)),
  CONSTRAINT "game_content_dungeons_check_3" CHECK ((max_rooms IS NULL OR max_rooms <= 12))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_content_dungeons_definition_idx" ON "game_content_dungeons" ("content_version","definition_id");
--> statement-breakpoint
CREATE TABLE "game_dungeon_runs" (
  "content_version" text NOT NULL,
  "character_id" text NOT NULL,
  "definition_id" text NOT NULL,
  "return_world_id" text NOT NULL,
  "return_x" integer NOT NULL,
  "return_y" integer NOT NULL,
  "blueprint" text NOT NULL,
  "boss_door_opened" integer NOT NULL,
  "selected_chest" text,
  PRIMARY KEY ("character_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","definition_id") REFERENCES "game_content_dungeons" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","return_world_id") REFERENCES "game_content_worlds" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_dungeon_runs_check_0" CHECK (boss_door_opened IN (0,1)),
  CONSTRAINT "game_dungeon_runs_check_1" CHECK (json_valid(blueprint))
);
--> statement-breakpoint
CREATE TABLE "game_dungeon_effects" (
  "content_version" text NOT NULL,
  "character_id" text NOT NULL,
  "position" integer NOT NULL,
  "status_id" text NOT NULL,
  "stacks" integer NOT NULL,
  PRIMARY KEY ("character_id","position"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","status_id") REFERENCES "game_content_status_effects" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("character_id") REFERENCES "game_dungeon_runs" ("character_id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_dungeon_effects_check_0" CHECK (position BETWEEN 0 AND 11),
  CONSTRAINT "game_dungeon_effects_check_1" CHECK (stacks BETWEEN 1 AND 10)
);
--> statement-breakpoint
CREATE TABLE "game_dungeon_flags" (
  "character_id" text NOT NULL,
  "kind" text NOT NULL,
  "object_id" text NOT NULL,
  "position" integer NOT NULL,
  PRIMARY KEY ("character_id","kind","object_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id") REFERENCES "game_dungeon_runs" ("character_id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_dungeon_flags_check_0" CHECK (kind IN ('cleared','opened','revealedMimics','usedFountains')),
  CONSTRAINT "game_dungeon_flags_check_1" CHECK (position BETWEEN 0 AND 16)
);
--> statement-breakpoint
CREATE TABLE "game_dungeon_keys" (
  "character_id" text NOT NULL,
  "kind" text NOT NULL,
  "status" text NOT NULL,
  "x" integer,
  "y" integer,
  PRIMARY KEY ("character_id","kind"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id") REFERENCES "game_dungeon_runs" ("character_id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_dungeon_keys_check_0" CHECK (kind IN ('bossKey','treasureKey')),
  CONSTRAINT "game_dungeon_keys_check_1" CHECK (status IN ('absent','dropped','held','spent')),
  CONSTRAINT "game_dungeon_keys_check_2" CHECK ((x IS NULL) = (y IS NULL))
);
--> statement-breakpoint
CREATE TABLE "game_content_maps" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "width" integer NOT NULL,
  "height" integer NOT NULL,
  "tile_size" integer NOT NULL,
  "tiles" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position"),
  FOREIGN KEY ("content_version") REFERENCES "game_content_releases" ("content_version") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_maps_check_0" CHECK ((width IS NULL OR width >= 1)),
  CONSTRAINT "game_content_maps_check_1" CHECK ((width IS NULL OR width <= 128)),
  CONSTRAINT "game_content_maps_check_2" CHECK ((height IS NULL OR height >= 1)),
  CONSTRAINT "game_content_maps_check_3" CHECK ((height IS NULL OR height <= 128)),
  CONSTRAINT "game_content_maps_check_4" CHECK ((tile_size IS NULL OR tile_size >= 1)),
  CONSTRAINT "game_content_maps_check_5" CHECK ((tile_size IS NULL OR tile_size <= 128)),
  CONSTRAINT "game_content_maps_check_6" CHECK ((tiles IS NULL OR json_valid(tiles)))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_content_maps_definition_idx" ON "game_content_maps" ("content_version","definition_id");
--> statement-breakpoint
CREATE TABLE "game_encounters" (
  "content_version" text NOT NULL,
  "character_id" text NOT NULL,
  "encounter_id" text NOT NULL,
  "phase" text NOT NULL DEFAULT 'selectingAction',
  "algorithm" text NOT NULL DEFAULT 'xoroshiro128plus',
  "world_id" text NOT NULL,
  "object_id" text NOT NULL,
  "map_id" text NOT NULL,
  "map_definition_id" text,
  "seed" integer NOT NULL,
  "version" integer NOT NULL,
  "word0" integer NOT NULL,
  "word1" integer NOT NULL,
  "word2" integer NOT NULL,
  "word3" integer NOT NULL,
  "result" text,
  "action_sequence" integer NOT NULL,
  "cursor" integer NOT NULL,
  "training_last_action" integer NOT NULL,
  "quest_last_action" integer NOT NULL,
  "title_eligible" integer NOT NULL,
  "title_flawless" integer NOT NULL,
  PRIMARY KEY ("character_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","map_definition_id") REFERENCES "game_content_maps" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_encounters_check_0" CHECK (version = 1),
  CONSTRAINT "game_encounters_check_1" CHECK (result IS NULL OR result IN ('victory','defeat')),
  CONSTRAINT "game_encounters_check_2" CHECK (action_sequence >= 0),
  CONSTRAINT "game_encounters_check_3" CHECK (cursor >= 0),
  CONSTRAINT "game_encounters_check_4" CHECK (training_last_action >= 0),
  CONSTRAINT "game_encounters_check_5" CHECK (quest_last_action >= 0),
  CONSTRAINT "game_encounters_check_6" CHECK (title_eligible IN (0,1)),
  CONSTRAINT "game_encounters_check_7" CHECK (title_flawless IN (0,1))
);
--> statement-breakpoint
CREATE TABLE "game_encounter_actors" (
  "character_id" text NOT NULL,
  "actor_id" text NOT NULL,
  "position" integer NOT NULL,
  "defending_position" integer,
  PRIMARY KEY ("character_id","actor_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id") REFERENCES "game_encounters" ("character_id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_encounter_actors_check_0" CHECK (position >= 0)
);
--> statement-breakpoint
CREATE TABLE "game_encounter_enemy_history" (
  "content_version" text NOT NULL,
  "character_id" text NOT NULL,
  "actor_id" text NOT NULL,
  "position" integer NOT NULL,
  "action" text NOT NULL,
  "item_id" text,
  "skill_id" text,
  "target_id" text,
  PRIMARY KEY ("character_id","actor_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","skill_id") REFERENCES "game_content_skills" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("character_id","actor_id") REFERENCES "game_encounter_actors" ("character_id","actor_id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_enemy_history_order" CHECK (position >= 0),
  CONSTRAINT "game_encounter_enemy_history_check_0" CHECK (action IN ('attack','skill','defend','rest','item'))
);
--> statement-breakpoint
CREATE TABLE "game_encounter_quest_evidence" (
  "content_version" text NOT NULL,
  "character_id" text NOT NULL,
  "quest_id" text NOT NULL,
  "stage_id" text NOT NULL,
  "objective_id" text NOT NULL,
  "count" integer NOT NULL,
  PRIMARY KEY ("character_id","quest_id","objective_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","quest_id") REFERENCES "game_content_quests" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("character_id") REFERENCES "game_encounters" ("character_id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_encounter_quest_evidence_check_0" CHECK (count BETWEEN 0 AND 999)
);
--> statement-breakpoint
CREATE TABLE "game_encounter_rewards" (
  "character_id" text NOT NULL,
  "gold" integer NOT NULL,
  "experience" integer NOT NULL,
  "word0" integer NOT NULL,
  "word1" integer NOT NULL,
  "word2" integer NOT NULL,
  "word3" integer NOT NULL,
  PRIMARY KEY ("character_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id") REFERENCES "game_encounters" ("character_id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_encounter_rewards_check_0" CHECK (gold >= 0),
  CONSTRAINT "game_encounter_rewards_check_1" CHECK (experience >= 0)
);
--> statement-breakpoint
CREATE TABLE "game_encounter_reward_items" (
  "content_version" text NOT NULL,
  "character_id" text NOT NULL,
  "position" integer NOT NULL,
  "item_id" text NOT NULL,
  "quantity" integer NOT NULL,
  "collectable" integer NOT NULL,
  PRIMARY KEY ("character_id","position"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("character_id") REFERENCES "game_encounter_rewards" ("character_id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_encounter_reward_items_check_0" CHECK (position >= 0),
  CONSTRAINT "game_encounter_reward_items_check_1" CHECK (quantity >= 0),
  CONSTRAINT "game_encounter_reward_items_check_2" CHECK (collectable BETWEEN 0 AND quantity)
);
--> statement-breakpoint
CREATE TABLE "game_encounter_training" (
  "content_version" text NOT NULL,
  "character_id" text NOT NULL,
  "skill_id" text NOT NULL,
  "objective_id" text NOT NULL,
  "count" integer NOT NULL,
  PRIMARY KEY ("character_id","skill_id","objective_id"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","skill_id") REFERENCES "game_content_skills" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("character_id") REFERENCES "game_encounters" ("character_id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_encounter_training_check_0" CHECK (count BETWEEN 0 AND 1000)
);
--> statement-breakpoint
CREATE TABLE "game_encounter_turn_order" (
  "character_id" text NOT NULL,
  "position" integer NOT NULL,
  "actor_id" text NOT NULL,
  "defending" integer NOT NULL,
  PRIMARY KEY ("character_id","position"),
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","actor_id") REFERENCES "game_encounter_actors" ("character_id","actor_id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_encounter_turn_order_check_0" CHECK (position >= 0),
  CONSTRAINT "game_encounter_turn_order_check_1" CHECK (defending IN (0,1))
);
--> statement-breakpoint
CREATE TABLE "game_command_receipts" (
  "user_id" text NOT NULL,
  "command_id" text NOT NULL,
  "character_id" text NOT NULL,
  "request_hash" text NOT NULL,
  "base_revision" integer NOT NULL,
  "committed_revision" integer NOT NULL,
  "outcome" text NOT NULL,
  "created_at" integer NOT NULL,
  PRIMARY KEY ("user_id","command_id"),
  FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id") REFERENCES "game_characters" ("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_command_receipts_check_0" CHECK (committed_revision = base_revision + 1),
  CONSTRAINT "game_command_receipts_check_1" CHECK (base_revision >= 0),
  CONSTRAINT "game_command_receipts_check_2" CHECK (json_valid(outcome))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_command_revision_idx" ON "game_command_receipts" ("character_id","committed_revision");
--> statement-breakpoint
CREATE INDEX "game_command_character_idx" ON "game_command_receipts" ("character_id");
--> statement-breakpoint
CREATE TABLE "game_command_receipt_features" (
  "user_id" text NOT NULL,
  "command_id" text NOT NULL,
  "feature" text NOT NULL,
  PRIMARY KEY ("user_id","command_id","feature"),
  FOREIGN KEY ("user_id","command_id") REFERENCES "game_command_receipts" ("user_id","command_id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_command_feature_check" CHECK (feature IN ('character','progression','resources','stats','inventory','equipment','skills','quests','titles','enchanting','journey','rest','dungeon','encounter'))
);
--> statement-breakpoint
CREATE TABLE "game_content_configuration" (
  "key" text PRIMARY KEY NOT NULL,
  "content_version" text NOT NULL,
  FOREIGN KEY ("content_version") REFERENCES "game_content_releases" ("content_version") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "game_content_classes_skills" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "skills_position" integer NOT NULL,
  "value" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","skills_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_classes" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","value") REFERENCES "game_content_skills" ("content_version","definition_id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "game_content_classes_sprite_idle_frames" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "sprite_idle_frames_position" integer NOT NULL,
  "value" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","sprite_idle_frames_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_classes" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_classes_sprite_idle_frames_check_0" CHECK ((value IS NULL OR value >= 0)),
  CONSTRAINT "game_content_classes_sprite_idle_frames_check_1" CHECK ((value IS NULL OR value <= 9007199254740991))
);
--> statement-breakpoint
CREATE TABLE "game_content_dungeons_companion_ids" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "companion_ids_position" integer NOT NULL,
  "value" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","companion_ids_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_dungeons" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "game_content_dungeons_final_rewards" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "final_rewards_position" integer NOT NULL,
  "value_item_id" text NOT NULL,
  "value_min" integer NOT NULL,
  "value_max" integer NOT NULL,
  "value_weight" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","final_rewards_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_dungeons" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","value_item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_content_dungeons_final_rewards_check_0" CHECK ((value_min IS NULL OR value_min >= 1)),
  CONSTRAINT "game_content_dungeons_final_rewards_check_1" CHECK ((value_min IS NULL OR value_min <= 99)),
  CONSTRAINT "game_content_dungeons_final_rewards_check_2" CHECK ((value_max IS NULL OR value_max >= 1)),
  CONSTRAINT "game_content_dungeons_final_rewards_check_3" CHECK ((value_max IS NULL OR value_max <= 99)),
  CONSTRAINT "game_content_dungeons_final_rewards_check_4" CHECK ((value_weight IS NULL OR value_weight >= 1)),
  CONSTRAINT "game_content_dungeons_final_rewards_check_5" CHECK ((value_weight IS NULL OR value_weight <= 1000))
);
--> statement-breakpoint
CREATE TABLE "game_content_dungeons_fountain_ids" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "fountain_ids_position" integer NOT NULL,
  "value" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","fountain_ids_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_dungeons" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "game_content_dungeons_monster_ids" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "monster_ids_position" integer NOT NULL,
  "value" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","monster_ids_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_dungeons" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "game_content_dungeons_ordinary_rewards" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "ordinary_rewards_position" integer NOT NULL,
  "value_item_id" text NOT NULL,
  "value_min" integer NOT NULL,
  "value_max" integer NOT NULL,
  "value_weight" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","ordinary_rewards_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_dungeons" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","value_item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_content_dungeons_ordinary_rewards_check_0" CHECK ((value_min IS NULL OR value_min >= 1)),
  CONSTRAINT "game_content_dungeons_ordinary_rewards_check_1" CHECK ((value_min IS NULL OR value_min <= 99)),
  CONSTRAINT "game_content_dungeons_ordinary_rewards_check_2" CHECK ((value_max IS NULL OR value_max >= 1)),
  CONSTRAINT "game_content_dungeons_ordinary_rewards_check_3" CHECK ((value_max IS NULL OR value_max <= 99)),
  CONSTRAINT "game_content_dungeons_ordinary_rewards_check_4" CHECK ((value_weight IS NULL OR value_weight >= 1)),
  CONSTRAINT "game_content_dungeons_ordinary_rewards_check_5" CHECK ((value_weight IS NULL OR value_weight <= 1000))
);
--> statement-breakpoint
CREATE TABLE "game_content_enchanting_rules" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "value_int_cap" integer NOT NULL,
  "value_int_bonus_bp_per_point" integer NOT NULL,
  "value_mana_herb_id" text NOT NULL,
  "value_holy_water_id" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position"),
  FOREIGN KEY ("content_version") REFERENCES "game_content_releases" ("content_version") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_enchanting_rules_check_0" CHECK ((value_int_cap IS NULL OR value_int_cap >= 0)),
  CONSTRAINT "game_content_enchanting_rules_check_1" CHECK ((value_int_cap IS NULL OR value_int_cap <= 1500)),
  CONSTRAINT "game_content_enchanting_rules_check_2" CHECK ((value_int_bonus_bp_per_point IS NULL OR value_int_bonus_bp_per_point >= 0)),
  CONSTRAINT "game_content_enchanting_rules_check_3" CHECK ((value_int_bonus_bp_per_point IS NULL OR value_int_bonus_bp_per_point <= 10000))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_content_enchanting_rules_definition_idx" ON "game_content_enchanting_rules" ("content_version","definition_id");
--> statement-breakpoint
CREATE TABLE "game_content_enchanting_rules_value_base_chance_bp" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "value_base_chance_bp_key" text NOT NULL,
  "value" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","value_base_chance_bp_key"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_enchanting_rules" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_enchanting_rules_value_base_chance_bp_check_0" CHECK ((value IS NULL OR value >= 0)),
  CONSTRAINT "game_content_enchanting_rules_value_base_chance_bp_check_1" CHECK ((value IS NULL OR value <= 10000))
);
--> statement-breakpoint
CREATE TABLE "game_content_enchanting_rules_value_powder_bonus_bp" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "value_powder_bonus_bp_key" text NOT NULL,
  "value" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","value_powder_bonus_bp_key"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_enchanting_rules" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_enchanting_rules_value_powder_bonus_bp_check_0" CHECK ((value IS NULL OR value >= 0)),
  CONSTRAINT "game_content_enchanting_rules_value_powder_bonus_bp_check_1" CHECK ((value IS NULL OR value <= 10000))
);
--> statement-breakpoint
CREATE TABLE "game_content_enchanting_rules_value_recipes" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "value_recipes_key" text NOT NULL,
  "value_scroll_count" real NOT NULL,
  "value_powder_count" real NOT NULL,
  "value_mana_cost" integer NOT NULL,
  "value_burn_mana_cost" integer NOT NULL,
  "value_burn_chance_bp" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","value_recipes_key"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_enchanting_rules" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_enchanting_rules_value_recipes_check_0" CHECK ((value_scroll_count IS NULL OR value_scroll_count IN (1))),
  CONSTRAINT "game_content_enchanting_rules_value_recipes_check_1" CHECK ((value_powder_count IS NULL OR value_powder_count IN (1))),
  CONSTRAINT "game_content_enchanting_rules_value_recipes_check_2" CHECK ((value_mana_cost IS NULL OR value_mana_cost >= 1)),
  CONSTRAINT "game_content_enchanting_rules_value_recipes_check_3" CHECK ((value_mana_cost IS NULL OR value_mana_cost <= 10000)),
  CONSTRAINT "game_content_enchanting_rules_value_recipes_check_4" CHECK ((value_burn_mana_cost IS NULL OR value_burn_mana_cost >= 1)),
  CONSTRAINT "game_content_enchanting_rules_value_recipes_check_5" CHECK ((value_burn_mana_cost IS NULL OR value_burn_mana_cost <= 10000)),
  CONSTRAINT "game_content_enchanting_rules_value_recipes_check_6" CHECK ((value_burn_chance_bp IS NULL OR value_burn_chance_bp >= 0)),
  CONSTRAINT "game_content_enchanting_rules_value_recipes_check_7" CHECK ((value_burn_chance_bp IS NULL OR value_burn_chance_bp <= 10000))
);
--> statement-breakpoint
CREATE TABLE "game_content_enchants_clauses" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "clauses_position" integer NOT NULL,
  "value_id" text NOT NULL,
  "value_stat" text NOT NULL,
  "value_unit" text NOT NULL,
  "value_min" integer NOT NULL,
  "value_max" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","clauses_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_enchants" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_enchants_clauses_check_0" CHECK ((value_stat IS NULL OR value_stat IN ('strength','intelligence','dexterity','will','luck','maxHealth','maxMana','maxStamina','physicalAttack','magicAttack','defense','protection','magicDefense','magicProtection'))),
  CONSTRAINT "game_content_enchants_clauses_check_1" CHECK ((value_unit IS NULL OR value_unit IN ('flat'))),
  CONSTRAINT "game_content_enchants_clauses_check_2" CHECK ((value_min IS NULL OR value_min >= -1000)),
  CONSTRAINT "game_content_enchants_clauses_check_3" CHECK ((value_min IS NULL OR value_min <= 1000)),
  CONSTRAINT "game_content_enchants_clauses_check_4" CHECK ((value_max IS NULL OR value_max >= -1000)),
  CONSTRAINT "game_content_enchants_clauses_check_5" CHECK ((value_max IS NULL OR value_max <= 1000))
);
--> statement-breakpoint
CREATE TABLE "game_content_enchants_clauses_value_conditions" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "clauses_position" integer NOT NULL,
  "value_conditions_position" integer NOT NULL,
  "value_kind" text,
  "value_skill_id" text,
  "value_rank" text,
  "value_minimum" integer,
  "value_talent" text,
  PRIMARY KEY ("content_version","definition_id","position","clauses_position","value_conditions_position"),
  FOREIGN KEY ("content_version","definition_id","position","clauses_position") REFERENCES "game_content_enchants_clauses" ("content_version","definition_id","position","clauses_position") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","value_skill_id") REFERENCES "game_content_skills" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_content_enchants_clauses_value_conditions_check_0" CHECK ((value_rank IS NULL OR value_rank IN ('1','2','3','4','5','6','7','8','9','F','E','D','C','B','A'))),
  CONSTRAINT "game_content_enchants_clauses_value_conditions_check_1" CHECK ((value_minimum IS NULL OR value_minimum >= 1)),
  CONSTRAINT "game_content_enchants_clauses_value_conditions_check_2" CHECK ((value_minimum IS NULL OR value_minimum <= 200)),
  CONSTRAINT "game_content_enchants_clauses_value_conditions_check_3" CHECK ((value_talent IS NULL OR value_talent IN ('warrior','mage','archery')))
);
--> statement-breakpoint
CREATE TABLE "game_content_enchants_kinds" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "kinds_position" integer NOT NULL,
  "value" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","kinds_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_enchants" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_enchants_kinds_check_0" CHECK ((value IS NULL OR value IN ('weapon','armor')))
);
--> statement-breakpoint
CREATE TABLE "game_content_enchants_tags" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "tags_position" integer NOT NULL,
  "value" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","tags_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_enchants" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_enchants_tags_check_0" CHECK ((value IS NULL OR value IN ('melee','sword')))
);
--> statement-breakpoint
CREATE TABLE "game_content_enemies" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "max_health" integer NOT NULL,
  "max_mana" integer NOT NULL,
  "combatant_attack" integer NOT NULL,
  "combatant_defense" integer NOT NULL,
  "combatant_speed" integer NOT NULL,
  "combatant_min_damage" integer,
  "combatant_max_damage" integer,
  "combatant_balance" real,
  "combatant_magic_attack" integer,
  "combatant_magic_defense" integer,
  "combatant_protection" integer,
  "combatant_magic_protection" integer,
  "combatant_magic_balance" real,
  "combatant_magic_critical_chance" real,
  "combatant_critical_rating" real,
  "combatant_min_injury" real,
  "combatant_max_injury" real,
  "combatant_armor_pierce" integer,
  "combatant_hit_chance" real,
  "combatant_evasion" real,
  "combatant_critical_chance" real,
  "combatant_critical_multiplier" real,
  "max_stamina" integer,
  "sprite_atlas" text NOT NULL,
  "sprite_frame" integer NOT NULL,
  "sprite_idle_frames_present" integer NOT NULL,
  "battle_a_i_present" integer NOT NULL,
  "battle_a_i_engine_id" text,
  "battle_a_i_config" text,
  "experience" integer,
  "gold" integer,
  "loot_present" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position"),
  FOREIGN KEY ("content_version") REFERENCES "game_content_releases" ("content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","sprite_atlas") REFERENCES "game_content_atlases" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_content_enemies_check_0" CHECK ((max_health IS NULL OR max_health >= 1)),
  CONSTRAINT "game_content_enemies_check_1" CHECK ((max_health IS NULL OR max_health <= 100000)),
  CONSTRAINT "game_content_enemies_check_2" CHECK ((max_mana IS NULL OR max_mana >= 0)),
  CONSTRAINT "game_content_enemies_check_3" CHECK ((max_mana IS NULL OR max_mana <= 100000)),
  CONSTRAINT "game_content_enemies_check_4" CHECK ((combatant_attack IS NULL OR combatant_attack >= 0)),
  CONSTRAINT "game_content_enemies_check_5" CHECK ((combatant_attack IS NULL OR combatant_attack <= 1000000)),
  CONSTRAINT "game_content_enemies_check_6" CHECK ((combatant_defense IS NULL OR combatant_defense >= 0)),
  CONSTRAINT "game_content_enemies_check_7" CHECK ((combatant_defense IS NULL OR combatant_defense <= 1000000)),
  CONSTRAINT "game_content_enemies_check_8" CHECK ((combatant_speed IS NULL OR combatant_speed >= 0)),
  CONSTRAINT "game_content_enemies_check_9" CHECK ((combatant_speed IS NULL OR combatant_speed <= 1000000)),
  CONSTRAINT "game_content_enemies_check_10" CHECK ((combatant_min_damage IS NULL OR combatant_min_damage >= 0)),
  CONSTRAINT "game_content_enemies_check_11" CHECK ((combatant_min_damage IS NULL OR combatant_min_damage <= 1000000)),
  CONSTRAINT "game_content_enemies_check_12" CHECK ((combatant_max_damage IS NULL OR combatant_max_damage >= 0)),
  CONSTRAINT "game_content_enemies_check_13" CHECK ((combatant_max_damage IS NULL OR combatant_max_damage <= 1000000)),
  CONSTRAINT "game_content_enemies_check_14" CHECK ((combatant_balance IS NULL OR combatant_balance >= 0)),
  CONSTRAINT "game_content_enemies_check_15" CHECK ((combatant_balance IS NULL OR combatant_balance <= 1)),
  CONSTRAINT "game_content_enemies_check_16" CHECK ((combatant_magic_attack IS NULL OR combatant_magic_attack >= 0)),
  CONSTRAINT "game_content_enemies_check_17" CHECK ((combatant_magic_attack IS NULL OR combatant_magic_attack <= 1000000)),
  CONSTRAINT "game_content_enemies_check_18" CHECK ((combatant_magic_defense IS NULL OR combatant_magic_defense >= 0)),
  CONSTRAINT "game_content_enemies_check_19" CHECK ((combatant_magic_defense IS NULL OR combatant_magic_defense <= 1000000)),
  CONSTRAINT "game_content_enemies_check_20" CHECK ((combatant_protection IS NULL OR combatant_protection >= 0)),
  CONSTRAINT "game_content_enemies_check_21" CHECK ((combatant_protection IS NULL OR combatant_protection <= 1000000)),
  CONSTRAINT "game_content_enemies_check_22" CHECK ((combatant_magic_protection IS NULL OR combatant_magic_protection >= 0)),
  CONSTRAINT "game_content_enemies_check_23" CHECK ((combatant_magic_protection IS NULL OR combatant_magic_protection <= 1000000)),
  CONSTRAINT "game_content_enemies_check_24" CHECK ((combatant_magic_balance IS NULL OR combatant_magic_balance >= 0)),
  CONSTRAINT "game_content_enemies_check_25" CHECK ((combatant_magic_balance IS NULL OR combatant_magic_balance <= 1)),
  CONSTRAINT "game_content_enemies_check_26" CHECK ((combatant_magic_critical_chance IS NULL OR combatant_magic_critical_chance >= 0)),
  CONSTRAINT "game_content_enemies_check_27" CHECK ((combatant_magic_critical_chance IS NULL OR combatant_magic_critical_chance <= 9.999)),
  CONSTRAINT "game_content_enemies_check_28" CHECK ((combatant_critical_rating IS NULL OR combatant_critical_rating >= 0)),
  CONSTRAINT "game_content_enemies_check_29" CHECK ((combatant_critical_rating IS NULL OR combatant_critical_rating <= 9.999)),
  CONSTRAINT "game_content_enemies_check_30" CHECK ((combatant_min_injury IS NULL OR combatant_min_injury >= 0)),
  CONSTRAINT "game_content_enemies_check_31" CHECK ((combatant_min_injury IS NULL OR combatant_min_injury <= 1)),
  CONSTRAINT "game_content_enemies_check_32" CHECK ((combatant_max_injury IS NULL OR combatant_max_injury >= 0)),
  CONSTRAINT "game_content_enemies_check_33" CHECK ((combatant_max_injury IS NULL OR combatant_max_injury <= 1)),
  CONSTRAINT "game_content_enemies_check_34" CHECK ((combatant_armor_pierce IS NULL OR combatant_armor_pierce >= 0)),
  CONSTRAINT "game_content_enemies_check_35" CHECK ((combatant_armor_pierce IS NULL OR combatant_armor_pierce <= 1000000)),
  CONSTRAINT "game_content_enemies_check_36" CHECK ((combatant_hit_chance IS NULL OR combatant_hit_chance >= 0)),
  CONSTRAINT "game_content_enemies_check_37" CHECK ((combatant_hit_chance IS NULL OR combatant_hit_chance <= 1)),
  CONSTRAINT "game_content_enemies_check_38" CHECK ((combatant_evasion IS NULL OR combatant_evasion >= 0)),
  CONSTRAINT "game_content_enemies_check_39" CHECK ((combatant_evasion IS NULL OR combatant_evasion <= 1)),
  CONSTRAINT "game_content_enemies_check_40" CHECK ((combatant_critical_chance IS NULL OR combatant_critical_chance >= 0)),
  CONSTRAINT "game_content_enemies_check_41" CHECK ((combatant_critical_chance IS NULL OR combatant_critical_chance <= 1)),
  CONSTRAINT "game_content_enemies_check_42" CHECK ((combatant_critical_multiplier IS NULL OR combatant_critical_multiplier >= 1)),
  CONSTRAINT "game_content_enemies_check_43" CHECK ((combatant_critical_multiplier IS NULL OR combatant_critical_multiplier <= 10)),
  CONSTRAINT "game_content_enemies_check_44" CHECK ((max_stamina IS NULL OR max_stamina >= 0)),
  CONSTRAINT "game_content_enemies_check_45" CHECK ((max_stamina IS NULL OR max_stamina <= 100000)),
  CONSTRAINT "game_content_enemies_check_46" CHECK ((sprite_frame IS NULL OR sprite_frame >= 0)),
  CONSTRAINT "game_content_enemies_check_47" CHECK ((sprite_frame IS NULL OR sprite_frame <= 9007199254740991)),
  CONSTRAINT "game_content_enemies_check_48" CHECK ((sprite_idle_frames_present IS NULL OR sprite_idle_frames_present IN (0,1))),
  CONSTRAINT "game_content_enemies_check_49" CHECK ((battle_a_i_present IS NULL OR battle_a_i_present IN (0,1))),
  CONSTRAINT "game_content_enemies_check_50" CHECK ((battle_a_i_config IS NULL OR json_valid(battle_a_i_config))),
  CONSTRAINT "game_content_enemies_check_51" CHECK ((experience IS NULL OR experience >= 0)),
  CONSTRAINT "game_content_enemies_check_52" CHECK ((experience IS NULL OR experience <= 10000)),
  CONSTRAINT "game_content_enemies_check_53" CHECK ((gold IS NULL OR gold >= 0)),
  CONSTRAINT "game_content_enemies_check_54" CHECK ((gold IS NULL OR gold <= 10000)),
  CONSTRAINT "game_content_enemies_check_55" CHECK ((loot_present IS NULL OR loot_present IN (0,1)))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_content_enemies_definition_idx" ON "game_content_enemies" ("content_version","definition_id");
--> statement-breakpoint
CREATE TABLE "game_content_enemies_loot" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "loot_position" integer NOT NULL,
  "value_item_id" text NOT NULL,
  "value_chance" real NOT NULL,
  "value_min" integer NOT NULL,
  "value_max" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","loot_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_enemies" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","value_item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_content_enemies_loot_check_0" CHECK ((value_chance IS NULL OR value_chance >= 0)),
  CONSTRAINT "game_content_enemies_loot_check_1" CHECK ((value_chance IS NULL OR value_chance <= 1)),
  CONSTRAINT "game_content_enemies_loot_check_2" CHECK ((value_min IS NULL OR value_min >= 1)),
  CONSTRAINT "game_content_enemies_loot_check_3" CHECK ((value_min IS NULL OR value_min <= 99)),
  CONSTRAINT "game_content_enemies_loot_check_4" CHECK ((value_max IS NULL OR value_max >= 1)),
  CONSTRAINT "game_content_enemies_loot_check_5" CHECK ((value_max IS NULL OR value_max <= 99))
);
--> statement-breakpoint
CREATE TABLE "game_content_enemies_skills" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "skills_position" integer NOT NULL,
  "value" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","skills_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_enemies" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","value") REFERENCES "game_content_skills" ("content_version","definition_id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "game_content_enemies_sprite_idle_frames" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "sprite_idle_frames_position" integer NOT NULL,
  "value" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","sprite_idle_frames_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_enemies" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_enemies_sprite_idle_frames_check_0" CHECK ((value IS NULL OR value >= 0)),
  CONSTRAINT "game_content_enemies_sprite_idle_frames_check_1" CHECK ((value IS NULL OR value <= 9007199254740991))
);
--> statement-breakpoint
CREATE TABLE "game_content_items_weapon_tags" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "weapon_tags_position" integer NOT NULL,
  "value" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","weapon_tags_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_items" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_items_weapon_tags_check_0" CHECK ((value IS NULL OR value IN ('melee','sword','bow')))
);
--> statement-breakpoint
CREATE TABLE "game_content_maps_spawns" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "spawns_position" integer NOT NULL,
  "value_entity_id" text NOT NULL,
  "value_kind" text NOT NULL,
  "value_definition_id" text NOT NULL,
  "value_x" integer NOT NULL,
  "value_y" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","spawns_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_maps" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_maps_spawns_check_0" CHECK ((value_kind IS NULL OR value_kind IN ('player','enemy'))),
  CONSTRAINT "game_content_maps_spawns_check_1" CHECK ((value_x IS NULL OR value_x >= 0)),
  CONSTRAINT "game_content_maps_spawns_check_2" CHECK ((value_x IS NULL OR value_x <= 9007199254740991)),
  CONSTRAINT "game_content_maps_spawns_check_3" CHECK ((value_y IS NULL OR value_y >= 0)),
  CONSTRAINT "game_content_maps_spawns_check_4" CHECK ((value_y IS NULL OR value_y <= 9007199254740991))
);
--> statement-breakpoint
CREATE TABLE "game_content_quests_rewards_flags" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "rewards_flags_position" integer NOT NULL,
  "value" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","rewards_flags_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_quests" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "game_content_quests_rewards_items" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "rewards_items_position" integer NOT NULL,
  "value_item_id" text NOT NULL,
  "value_quantity" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","rewards_items_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_quests" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","value_item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_content_quests_rewards_items_check_0" CHECK ((value_quantity IS NULL OR value_quantity >= 1)),
  CONSTRAINT "game_content_quests_rewards_items_check_1" CHECK ((value_quantity IS NULL OR value_quantity <= 999))
);
--> statement-breakpoint
CREATE TABLE "game_content_quests_rewards_skills" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "rewards_skills_position" integer NOT NULL,
  "value" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","rewards_skills_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_quests" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","value") REFERENCES "game_content_skills" ("content_version","definition_id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "game_content_quests_rewards_titles" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "rewards_titles_position" integer NOT NULL,
  "value" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","rewards_titles_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_quests" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "game_content_quests_stages" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "stages_position" integer NOT NULL,
  "value_id" text NOT NULL,
  "value_name" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","stages_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_quests" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "game_content_quests_stages_value_objectives" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "stages_position" integer NOT NULL,
  "value_objectives_position" integer NOT NULL,
  "value_id" text,
  "value_label" text,
  "value_target" real,
  "value_kind" text,
  "value_world_id" text,
  "value_object_id" text,
  "value_skill_id" text,
  "value_allow_defeat" integer,
  "value_map_id" text,
  "value_dungeon_id" text,
  "value_rank" text,
  "value_item_id" text,
  PRIMARY KEY ("content_version","definition_id","position","stages_position","value_objectives_position"),
  FOREIGN KEY ("content_version","definition_id","position","stages_position") REFERENCES "game_content_quests_stages" ("content_version","definition_id","position","stages_position") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","value_world_id") REFERENCES "game_content_worlds" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","value_skill_id") REFERENCES "game_content_skills" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","value_map_id") REFERENCES "game_content_maps" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","value_dungeon_id") REFERENCES "game_content_dungeons" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","value_item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_content_quests_stages_value_objectives_check_0" CHECK ((value_allow_defeat IS NULL OR value_allow_defeat IN (0,1))),
  CONSTRAINT "game_content_quests_stages_value_objectives_check_1" CHECK ((value_rank IS NULL OR value_rank IN ('1','2','3','4','5','6','7','8','9','F','E','D','C','B','A')))
);
--> statement-breakpoint
CREATE TABLE "game_content_shops" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "kind" text NOT NULL,
  "bundles_present" integer NOT NULL,
  "buys_items" integer,
  PRIMARY KEY ("content_version","definition_id","position"),
  FOREIGN KEY ("content_version") REFERENCES "game_content_releases" ("content_version") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_shops_check_0" CHECK ((kind IS NULL OR kind IN ('grocery','blacksmith','general'))),
  CONSTRAINT "game_content_shops_check_1" CHECK ((bundles_present IS NULL OR bundles_present IN (0,1))),
  CONSTRAINT "game_content_shops_check_2" CHECK ((buys_items IS NULL OR buys_items IN (0,1)))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_content_shops_definition_idx" ON "game_content_shops" ("content_version","definition_id");
--> statement-breakpoint
CREATE TABLE "game_content_shops_bundles" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "bundles_position" integer NOT NULL,
  "value_item_id" text NOT NULL,
  "value_quantity" integer NOT NULL,
  "value_price" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","bundles_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_shops" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","value_item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_content_shops_bundles_check_0" CHECK ((value_quantity IS NULL OR value_quantity >= 2)),
  CONSTRAINT "game_content_shops_bundles_check_1" CHECK ((value_quantity IS NULL OR value_quantity <= 999)),
  CONSTRAINT "game_content_shops_bundles_check_2" CHECK ((value_price IS NULL OR value_price >= 0)),
  CONSTRAINT "game_content_shops_bundles_check_3" CHECK ((value_price IS NULL OR value_price <= 100000))
);
--> statement-breakpoint
CREATE TABLE "game_content_shops_items" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "items_position" integer NOT NULL,
  "value" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","items_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_shops" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "game_content_skill_book_recipes_pages" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "pages_position" integer NOT NULL,
  "value_item_id" text NOT NULL,
  "value_hint" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","pages_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_skill_book_recipes" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","value_item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "game_content_skills_game_ranks" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "game_ranks_key" text NOT NULL,
  "value_min_power" integer NOT NULL,
  "value_max_power" integer NOT NULL,
  "value_mana_cost" integer NOT NULL,
  "value_stamina_cost" integer NOT NULL,
  "value_physical_multiplier" real,
  "value_bypass_defend" integer,
  "value_cooldown" integer,
  "value_next_rank" text,
  "value_ap_cost" integer,
  "value_stat_bonuses_present" integer NOT NULL,
  "value_stat_bonuses_strength" real,
  "value_stat_bonuses_intelligence" real,
  "value_stat_bonuses_dexterity" real,
  "value_stat_bonuses_will" real,
  "value_stat_bonuses_luck" real,
  "value_max_health" integer,
  "value_melee_min" integer,
  "value_melee_max" integer,
  "value_sword_min" integer,
  "value_sword_max" integer,
  "value_sword_balance" real,
  "value_ranged_min" integer,
  "value_ranged_max" integer,
  "value_ranged_balance" real,
  PRIMARY KEY ("content_version","definition_id","position","game_ranks_key"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_skills" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_skills_game_ranks_check_0" CHECK ((value_min_power IS NULL OR value_min_power >= 0)),
  CONSTRAINT "game_content_skills_game_ranks_check_1" CHECK ((value_min_power IS NULL OR value_min_power <= 1000000)),
  CONSTRAINT "game_content_skills_game_ranks_check_2" CHECK ((value_max_power IS NULL OR value_max_power >= 0)),
  CONSTRAINT "game_content_skills_game_ranks_check_3" CHECK ((value_max_power IS NULL OR value_max_power <= 1000000)),
  CONSTRAINT "game_content_skills_game_ranks_check_4" CHECK ((value_mana_cost IS NULL OR value_mana_cost >= 0)),
  CONSTRAINT "game_content_skills_game_ranks_check_5" CHECK ((value_mana_cost IS NULL OR value_mana_cost <= 10000)),
  CONSTRAINT "game_content_skills_game_ranks_check_6" CHECK ((value_stamina_cost IS NULL OR value_stamina_cost >= 0)),
  CONSTRAINT "game_content_skills_game_ranks_check_7" CHECK ((value_stamina_cost IS NULL OR value_stamina_cost <= 10000)),
  CONSTRAINT "game_content_skills_game_ranks_check_8" CHECK ((value_physical_multiplier IS NULL OR value_physical_multiplier >= 0)),
  CONSTRAINT "game_content_skills_game_ranks_check_9" CHECK ((value_physical_multiplier IS NULL OR value_physical_multiplier <= 10)),
  CONSTRAINT "game_content_skills_game_ranks_check_10" CHECK ((value_bypass_defend IS NULL OR value_bypass_defend IN (0,1))),
  CONSTRAINT "game_content_skills_game_ranks_check_11" CHECK ((value_cooldown IS NULL OR value_cooldown >= 0)),
  CONSTRAINT "game_content_skills_game_ranks_check_12" CHECK ((value_cooldown IS NULL OR value_cooldown <= 100)),
  CONSTRAINT "game_content_skills_game_ranks_check_13" CHECK ((value_next_rank IS NULL OR value_next_rank IN ('1','2','3','4','5','6','7','8','9','F','E','D','C','B','A'))),
  CONSTRAINT "game_content_skills_game_ranks_check_14" CHECK ((value_ap_cost IS NULL OR value_ap_cost >= 0)),
  CONSTRAINT "game_content_skills_game_ranks_check_15" CHECK ((value_ap_cost IS NULL OR value_ap_cost <= 10000)),
  CONSTRAINT "game_content_skills_game_ranks_check_16" CHECK ((value_stat_bonuses_present IS NULL OR value_stat_bonuses_present IN (0,1))),
  CONSTRAINT "game_content_skills_game_ranks_check_17" CHECK ((value_stat_bonuses_strength IS NULL OR value_stat_bonuses_strength >= -1500)),
  CONSTRAINT "game_content_skills_game_ranks_check_18" CHECK ((value_stat_bonuses_strength IS NULL OR value_stat_bonuses_strength <= 1500)),
  CONSTRAINT "game_content_skills_game_ranks_check_19" CHECK ((value_stat_bonuses_intelligence IS NULL OR value_stat_bonuses_intelligence >= -1500)),
  CONSTRAINT "game_content_skills_game_ranks_check_20" CHECK ((value_stat_bonuses_intelligence IS NULL OR value_stat_bonuses_intelligence <= 1500)),
  CONSTRAINT "game_content_skills_game_ranks_check_21" CHECK ((value_stat_bonuses_dexterity IS NULL OR value_stat_bonuses_dexterity >= -1500)),
  CONSTRAINT "game_content_skills_game_ranks_check_22" CHECK ((value_stat_bonuses_dexterity IS NULL OR value_stat_bonuses_dexterity <= 1500)),
  CONSTRAINT "game_content_skills_game_ranks_check_23" CHECK ((value_stat_bonuses_will IS NULL OR value_stat_bonuses_will >= -1500)),
  CONSTRAINT "game_content_skills_game_ranks_check_24" CHECK ((value_stat_bonuses_will IS NULL OR value_stat_bonuses_will <= 1500)),
  CONSTRAINT "game_content_skills_game_ranks_check_25" CHECK ((value_stat_bonuses_luck IS NULL OR value_stat_bonuses_luck >= -1500)),
  CONSTRAINT "game_content_skills_game_ranks_check_26" CHECK ((value_stat_bonuses_luck IS NULL OR value_stat_bonuses_luck <= 1500)),
  CONSTRAINT "game_content_skills_game_ranks_check_27" CHECK ((value_max_health IS NULL OR value_max_health >= 0)),
  CONSTRAINT "game_content_skills_game_ranks_check_28" CHECK ((value_max_health IS NULL OR value_max_health <= 10000)),
  CONSTRAINT "game_content_skills_game_ranks_check_29" CHECK ((value_melee_min IS NULL OR value_melee_min >= 0)),
  CONSTRAINT "game_content_skills_game_ranks_check_30" CHECK ((value_melee_min IS NULL OR value_melee_min <= 10000)),
  CONSTRAINT "game_content_skills_game_ranks_check_31" CHECK ((value_melee_max IS NULL OR value_melee_max >= 0)),
  CONSTRAINT "game_content_skills_game_ranks_check_32" CHECK ((value_melee_max IS NULL OR value_melee_max <= 10000)),
  CONSTRAINT "game_content_skills_game_ranks_check_33" CHECK ((value_sword_min IS NULL OR value_sword_min >= 0)),
  CONSTRAINT "game_content_skills_game_ranks_check_34" CHECK ((value_sword_min IS NULL OR value_sword_min <= 10000)),
  CONSTRAINT "game_content_skills_game_ranks_check_35" CHECK ((value_sword_max IS NULL OR value_sword_max >= 0)),
  CONSTRAINT "game_content_skills_game_ranks_check_36" CHECK ((value_sword_max IS NULL OR value_sword_max <= 10000)),
  CONSTRAINT "game_content_skills_game_ranks_check_37" CHECK ((value_sword_balance IS NULL OR value_sword_balance >= 0)),
  CONSTRAINT "game_content_skills_game_ranks_check_38" CHECK ((value_sword_balance IS NULL OR value_sword_balance <= 1)),
  CONSTRAINT "game_content_skills_game_ranks_check_39" CHECK ((value_ranged_min IS NULL OR value_ranged_min >= 0)),
  CONSTRAINT "game_content_skills_game_ranks_check_40" CHECK ((value_ranged_min IS NULL OR value_ranged_min <= 10000)),
  CONSTRAINT "game_content_skills_game_ranks_check_41" CHECK ((value_ranged_max IS NULL OR value_ranged_max >= 0)),
  CONSTRAINT "game_content_skills_game_ranks_check_42" CHECK ((value_ranged_max IS NULL OR value_ranged_max <= 10000)),
  CONSTRAINT "game_content_skills_game_ranks_check_43" CHECK ((value_ranged_balance IS NULL OR value_ranged_balance >= 0)),
  CONSTRAINT "game_content_skills_game_ranks_check_44" CHECK ((value_ranged_balance IS NULL OR value_ranged_balance <= 1))
);
--> statement-breakpoint
CREATE TABLE "game_content_skills_game_ranks_value_objectives" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "game_ranks_key" text NOT NULL,
  "value_objectives_position" integer NOT NULL,
  "value_id" text NOT NULL,
  "value_label" text NOT NULL,
  "value_event" text NOT NULL,
  "value_scope" text NOT NULL,
  "value_points" integer NOT NULL,
  "value_maximum" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","game_ranks_key","value_objectives_position"),
  FOREIGN KEY ("content_version","definition_id","position","game_ranks_key") REFERENCES "game_content_skills_game_ranks" ("content_version","definition_id","position","game_ranks_key") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_skills_game_ranks_value_objectives_check_0" CHECK ((value_event IS NULL OR value_event IN ('use','damage','defeat','heal','enchantSuccess','enchantFailure','burnUse','recovery'))),
  CONSTRAINT "game_content_skills_game_ranks_value_objectives_check_1" CHECK ((value_scope IS NULL OR value_scope IN ('action','target','encounter'))),
  CONSTRAINT "game_content_skills_game_ranks_value_objectives_check_2" CHECK ((value_points IS NULL OR value_points >= 1)),
  CONSTRAINT "game_content_skills_game_ranks_value_objectives_check_3" CHECK ((value_points IS NULL OR value_points <= 100)),
  CONSTRAINT "game_content_skills_game_ranks_value_objectives_check_4" CHECK ((value_maximum IS NULL OR value_maximum >= 1)),
  CONSTRAINT "game_content_skills_game_ranks_value_objectives_check_5" CHECK ((value_maximum IS NULL OR value_maximum <= 1000))
);
--> statement-breakpoint
CREATE TABLE "game_content_skills_statuses" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "statuses_position" integer NOT NULL,
  "value" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","statuses_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_skills" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "game_content_titles_effects" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "effects_position" integer NOT NULL,
  "value_stat" text NOT NULL,
  "value_value" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","effects_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_titles" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_content_titles_effects_check_0" CHECK ((value_stat IS NULL OR value_stat IN ('strength','intelligence','dexterity','will','luck','maxHealth','maxMana','maxStamina','physicalAttack','magicAttack','defense','protection','magicDefense','magicProtection'))),
  CONSTRAINT "game_content_titles_effects_check_1" CHECK ((value_value IS NULL OR value_value >= -1500)),
  CONSTRAINT "game_content_titles_effects_check_2" CHECK ((value_value IS NULL OR value_value <= 1500))
);
--> statement-breakpoint
CREATE TABLE "game_content_worlds_decorations" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "decorations_position" integer NOT NULL,
  "value_id" text NOT NULL,
  "value_x" integer NOT NULL,
  "value_y" integer NOT NULL,
  "value_sprite_atlas" text NOT NULL,
  "value_sprite_frame" integer NOT NULL,
  "value_size" integer,
  "value_blocking" integer,
  "value_object_id" text,
  PRIMARY KEY ("content_version","definition_id","position","decorations_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_worlds" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","value_sprite_atlas") REFERENCES "game_content_atlases" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_content_worlds_decorations_check_0" CHECK ((value_x IS NULL OR value_x >= 0)),
  CONSTRAINT "game_content_worlds_decorations_check_1" CHECK ((value_x IS NULL OR value_x <= 9007199254740991)),
  CONSTRAINT "game_content_worlds_decorations_check_2" CHECK ((value_y IS NULL OR value_y >= 0)),
  CONSTRAINT "game_content_worlds_decorations_check_3" CHECK ((value_y IS NULL OR value_y <= 9007199254740991)),
  CONSTRAINT "game_content_worlds_decorations_check_4" CHECK ((value_sprite_frame IS NULL OR value_sprite_frame >= 0)),
  CONSTRAINT "game_content_worlds_decorations_check_5" CHECK ((value_sprite_frame IS NULL OR value_sprite_frame <= 9007199254740991)),
  CONSTRAINT "game_content_worlds_decorations_check_6" CHECK ((value_size IS NULL OR value_size >= 1)),
  CONSTRAINT "game_content_worlds_decorations_check_7" CHECK ((value_size IS NULL OR value_size <= 5)),
  CONSTRAINT "game_content_worlds_decorations_check_8" CHECK ((value_blocking IS NULL OR value_blocking IN (0,1)))
);
--> statement-breakpoint
CREATE TABLE "game_content_worlds_objects" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "objects_position" integer NOT NULL,
  "value_id" text NOT NULL,
  "value_x" integer NOT NULL,
  "value_y" integer NOT NULL,
  "value_name" text NOT NULL,
  "value_sprite_present" integer NOT NULL,
  "value_sprite_atlas" text,
  "value_sprite_frame" integer,
  "value_kind" text NOT NULL,
  "value_enchanting" integer,
  "value_lessons_present" integer NOT NULL,
  "value_dialogue" text,
  "value_item_id" text,
  "value_quantity" integer,
  "value_destination" text,
  "value_encounter_map" text,
  "value_requires_cleared_present" integer NOT NULL,
  "value_destination_position_present" integer NOT NULL,
  "value_destination_position_x" integer,
  "value_destination_position_y" integer,
  "value_shop_id" text,
  "value_healing_cost" integer,
  "value_dungeon_id" text,
  "value_gate_type" text,
  "value_key_type" text,
  "value_blocked" integer,
  PRIMARY KEY ("content_version","definition_id","position","objects_position"),
  FOREIGN KEY ("content_version","definition_id","position") REFERENCES "game_content_worlds" ("content_version","definition_id","position") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","value_sprite_atlas") REFERENCES "game_content_atlases" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","value_item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","value_encounter_map") REFERENCES "game_content_maps" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","value_shop_id") REFERENCES "game_content_shops" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","value_dungeon_id") REFERENCES "game_content_dungeons" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_content_worlds_objects_check_0" CHECK ((value_x IS NULL OR value_x >= 0)),
  CONSTRAINT "game_content_worlds_objects_check_1" CHECK ((value_x IS NULL OR value_x <= 9007199254740991)),
  CONSTRAINT "game_content_worlds_objects_check_2" CHECK ((value_y IS NULL OR value_y >= 0)),
  CONSTRAINT "game_content_worlds_objects_check_3" CHECK ((value_y IS NULL OR value_y <= 9007199254740991)),
  CONSTRAINT "game_content_worlds_objects_check_4" CHECK ((value_sprite_present IS NULL OR value_sprite_present IN (0,1))),
  CONSTRAINT "game_content_worlds_objects_check_5" CHECK ((value_sprite_frame IS NULL OR value_sprite_frame >= 0)),
  CONSTRAINT "game_content_worlds_objects_check_6" CHECK ((value_sprite_frame IS NULL OR value_sprite_frame <= 9007199254740991)),
  CONSTRAINT "game_content_worlds_objects_check_7" CHECK ((value_kind IS NULL OR value_kind IN ('npc','chest','rest','portal','encounter','dungeonEntrance','statue','mimic','fountain','gate','key','finalChest','merchant','healer','altar'))),
  CONSTRAINT "game_content_worlds_objects_check_8" CHECK ((value_enchanting IS NULL OR value_enchanting IN (0,1))),
  CONSTRAINT "game_content_worlds_objects_check_9" CHECK ((value_lessons_present IS NULL OR value_lessons_present IN (0,1))),
  CONSTRAINT "game_content_worlds_objects_check_10" CHECK ((value_quantity IS NULL OR value_quantity >= 1)),
  CONSTRAINT "game_content_worlds_objects_check_11" CHECK ((value_quantity IS NULL OR value_quantity <= 99)),
  CONSTRAINT "game_content_worlds_objects_check_12" CHECK ((value_requires_cleared_present IS NULL OR value_requires_cleared_present IN (0,1))),
  CONSTRAINT "game_content_worlds_objects_check_13" CHECK ((value_destination_position_present IS NULL OR value_destination_position_present IN (0,1))),
  CONSTRAINT "game_content_worlds_objects_check_14" CHECK ((value_destination_position_x IS NULL OR value_destination_position_x >= 0)),
  CONSTRAINT "game_content_worlds_objects_check_15" CHECK ((value_destination_position_x IS NULL OR value_destination_position_x <= 9007199254740991)),
  CONSTRAINT "game_content_worlds_objects_check_16" CHECK ((value_destination_position_y IS NULL OR value_destination_position_y >= 0)),
  CONSTRAINT "game_content_worlds_objects_check_17" CHECK ((value_destination_position_y IS NULL OR value_destination_position_y <= 9007199254740991)),
  CONSTRAINT "game_content_worlds_objects_check_18" CHECK ((value_healing_cost IS NULL OR value_healing_cost >= 1)),
  CONSTRAINT "game_content_worlds_objects_check_19" CHECK ((value_healing_cost IS NULL OR value_healing_cost <= 100000)),
  CONSTRAINT "game_content_worlds_objects_check_20" CHECK ((value_gate_type IS NULL OR value_gate_type IN ('boss','treasure'))),
  CONSTRAINT "game_content_worlds_objects_check_21" CHECK ((value_key_type IS NULL OR value_key_type IN ('boss','treasure'))),
  CONSTRAINT "game_content_worlds_objects_check_22" CHECK ((value_blocked IS NULL OR value_blocked IN (0,1)))
);
--> statement-breakpoint
CREATE TABLE "game_content_worlds_objects_value_lessons" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "objects_position" integer NOT NULL,
  "value_lessons_position" integer NOT NULL,
  "value_skill_id" text NOT NULL,
  "value_fee" integer NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","objects_position","value_lessons_position"),
  FOREIGN KEY ("content_version","definition_id","position","objects_position") REFERENCES "game_content_worlds_objects" ("content_version","definition_id","position","objects_position") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","value_skill_id") REFERENCES "game_content_skills" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_content_worlds_objects_value_lessons_check_0" CHECK ((value_fee IS NULL OR value_fee >= 0)),
  CONSTRAINT "game_content_worlds_objects_value_lessons_check_1" CHECK ((value_fee IS NULL OR value_fee <= 100000))
);
--> statement-breakpoint
CREATE TABLE "game_content_worlds_objects_value_requires_cleared" (
  "content_version" text NOT NULL,
  "definition_id" text NOT NULL,
  "position" integer NOT NULL,
  "objects_position" integer NOT NULL,
  "value_requires_cleared_position" integer NOT NULL,
  "value" text NOT NULL,
  PRIMARY KEY ("content_version","definition_id","position","objects_position","value_requires_cleared_position"),
  FOREIGN KEY ("content_version","definition_id","position","objects_position") REFERENCES "game_content_worlds_objects" ("content_version","definition_id","position","objects_position") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "game_encounter_actor_state" (
  "character_id" text NOT NULL,
  "actor_id" text NOT NULL,
  "content_version" text NOT NULL,
  "id" text NOT NULL,
  "name" text,
  "inventory_present" integer NOT NULL,
  "item_hotbar_present" integer NOT NULL,
  "ammunition_item_id" text,
  "weapon_present" integer NOT NULL,
  "weapon_item_id" text,
  "weapon_durability" integer,
  "weapon_locked" integer,
  "weapon_prefix_present" integer NOT NULL,
  "weapon_prefix_enchant_id" text,
  "weapon_suffix_present" integer NOT NULL,
  "weapon_suffix_enchant_id" text,
  "weapon_id" text,
  "statuses_present" integer NOT NULL,
  "stamina_present" integer NOT NULL,
  "stamina_current" integer,
  "stamina_max" integer,
  "mana_present" integer NOT NULL,
  "mana_current" integer,
  "mana_max" integer,
  "health_present" integer NOT NULL,
  "health_current" integer,
  "health_max" integer,
  "wounds" integer,
  "fullness" real,
  "skills_present" integer NOT NULL,
  "learned_skills_present" integer NOT NULL,
  "cooldowns_present" integer NOT NULL,
  "position_present" integer NOT NULL,
  "position_x" integer,
  "position_y" integer,
  "sprite_present" integer NOT NULL,
  "sprite_atlas" text,
  "sprite_frame" integer,
  "sprite_idle_frames_present" integer NOT NULL,
  "combatant_present" integer NOT NULL,
  "combatant_attack" integer,
  "combatant_defense" integer,
  "combatant_speed" integer,
  "combatant_min_damage" real,
  "combatant_max_damage" real,
  "combatant_balance" real,
  "combatant_magic_attack" real,
  "combatant_magic_defense" real,
  "combatant_protection" real,
  "combatant_magic_protection" real,
  "combatant_magic_balance" real,
  "combatant_critical_rating" real,
  "combatant_magic_critical_chance" real,
  "combatant_min_injury" real,
  "combatant_max_injury" real,
  "combatant_armor_pierce" real,
  "combatant_hit_chance" real,
  "combatant_evasion" real,
  "combatant_critical_chance" real,
  "combatant_critical_multiplier" real,
  "dead" integer,
  "player" integer,
  "enemy" integer,
  "battle_a_i_present" integer NOT NULL,
  "battle_a_i_engine_id" text,
  "battle_a_i_config" text,
  "stat_source_present" integer NOT NULL,
  "stat_source_class_id" text,
  "stat_source_level" integer,
  "stat_source_growth_talent" text,
  "stat_source_weapon_item_id" text,
  "stat_source_ammunition_item_id" text,
  "stat_source_armor_item_id" text,
  "stat_source_enchantments_present" integer NOT NULL,
  "stat_source_titles_present" integer NOT NULL,
  PRIMARY KEY ("character_id","actor_id"),
  FOREIGN KEY ("character_id","actor_id") REFERENCES "game_encounter_actors" ("character_id","actor_id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","ammunition_item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","weapon_item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","weapon_prefix_enchant_id") REFERENCES "game_content_enchants" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","weapon_suffix_enchant_id") REFERENCES "game_content_enchants" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","sprite_atlas") REFERENCES "game_content_atlases" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","stat_source_class_id") REFERENCES "game_content_classes" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","stat_source_weapon_item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","stat_source_ammunition_item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  FOREIGN KEY ("content_version","stat_source_armor_item_id") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_encounter_actor_state_check_0" CHECK ((inventory_present IS NULL OR inventory_present IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_1" CHECK ((item_hotbar_present IS NULL OR item_hotbar_present IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_2" CHECK ((weapon_present IS NULL OR weapon_present IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_3" CHECK ((weapon_durability IS NULL OR weapon_durability >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_4" CHECK ((weapon_durability IS NULL OR weapon_durability <= 10000)),
  CONSTRAINT "game_encounter_actor_state_check_5" CHECK ((weapon_locked IS NULL OR weapon_locked IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_6" CHECK ((weapon_prefix_present IS NULL OR weapon_prefix_present IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_7" CHECK ((weapon_suffix_present IS NULL OR weapon_suffix_present IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_8" CHECK ((statuses_present IS NULL OR statuses_present IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_9" CHECK ((stamina_present IS NULL OR stamina_present IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_10" CHECK ((stamina_current IS NULL OR stamina_current >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_11" CHECK ((stamina_current IS NULL OR stamina_current <= 9007199254740991)),
  CONSTRAINT "game_encounter_actor_state_check_12" CHECK ((stamina_max IS NULL OR stamina_max >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_13" CHECK ((stamina_max IS NULL OR stamina_max <= 9007199254740991)),
  CONSTRAINT "game_encounter_actor_state_check_14" CHECK ((mana_present IS NULL OR mana_present IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_15" CHECK ((mana_current IS NULL OR mana_current >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_16" CHECK ((mana_current IS NULL OR mana_current <= 9007199254740991)),
  CONSTRAINT "game_encounter_actor_state_check_17" CHECK ((mana_max IS NULL OR mana_max >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_18" CHECK ((mana_max IS NULL OR mana_max <= 9007199254740991)),
  CONSTRAINT "game_encounter_actor_state_check_19" CHECK ((health_present IS NULL OR health_present IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_20" CHECK ((health_current IS NULL OR health_current >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_21" CHECK ((health_current IS NULL OR health_current <= 9007199254740991)),
  CONSTRAINT "game_encounter_actor_state_check_22" CHECK ((health_max IS NULL OR health_max >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_23" CHECK ((health_max IS NULL OR health_max <= 9007199254740991)),
  CONSTRAINT "game_encounter_actor_state_check_24" CHECK ((wounds IS NULL OR wounds >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_25" CHECK ((wounds IS NULL OR wounds <= 9007199254740991)),
  CONSTRAINT "game_encounter_actor_state_check_26" CHECK ((fullness IS NULL OR fullness >= 50)),
  CONSTRAINT "game_encounter_actor_state_check_27" CHECK ((fullness IS NULL OR fullness <= 100)),
  CONSTRAINT "game_encounter_actor_state_check_28" CHECK ((skills_present IS NULL OR skills_present IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_29" CHECK ((learned_skills_present IS NULL OR learned_skills_present IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_30" CHECK ((cooldowns_present IS NULL OR cooldowns_present IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_31" CHECK ((position_present IS NULL OR position_present IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_32" CHECK ((position_x IS NULL OR position_x >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_33" CHECK ((position_x IS NULL OR position_x <= 9007199254740991)),
  CONSTRAINT "game_encounter_actor_state_check_34" CHECK ((position_y IS NULL OR position_y >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_35" CHECK ((position_y IS NULL OR position_y <= 9007199254740991)),
  CONSTRAINT "game_encounter_actor_state_check_36" CHECK ((sprite_present IS NULL OR sprite_present IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_37" CHECK ((sprite_frame IS NULL OR sprite_frame >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_38" CHECK ((sprite_frame IS NULL OR sprite_frame <= 9007199254740991)),
  CONSTRAINT "game_encounter_actor_state_check_39" CHECK ((sprite_idle_frames_present IS NULL OR sprite_idle_frames_present IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_40" CHECK ((combatant_present IS NULL OR combatant_present IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_41" CHECK ((combatant_attack IS NULL OR combatant_attack >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_42" CHECK ((combatant_attack IS NULL OR combatant_attack <= 9007199254740991)),
  CONSTRAINT "game_encounter_actor_state_check_43" CHECK ((combatant_defense IS NULL OR combatant_defense >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_44" CHECK ((combatant_defense IS NULL OR combatant_defense <= 9007199254740991)),
  CONSTRAINT "game_encounter_actor_state_check_45" CHECK ((combatant_speed IS NULL OR combatant_speed >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_46" CHECK ((combatant_speed IS NULL OR combatant_speed <= 9007199254740991)),
  CONSTRAINT "game_encounter_actor_state_check_47" CHECK ((combatant_min_damage IS NULL OR combatant_min_damage >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_48" CHECK ((combatant_max_damage IS NULL OR combatant_max_damage >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_49" CHECK ((combatant_balance IS NULL OR combatant_balance >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_50" CHECK ((combatant_magic_attack IS NULL OR combatant_magic_attack >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_51" CHECK ((combatant_magic_defense IS NULL OR combatant_magic_defense >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_52" CHECK ((combatant_protection IS NULL OR combatant_protection >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_53" CHECK ((combatant_magic_protection IS NULL OR combatant_magic_protection >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_54" CHECK ((combatant_magic_balance IS NULL OR combatant_magic_balance >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_55" CHECK ((combatant_critical_rating IS NULL OR combatant_critical_rating >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_56" CHECK ((combatant_magic_critical_chance IS NULL OR combatant_magic_critical_chance >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_57" CHECK ((combatant_min_injury IS NULL OR combatant_min_injury >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_58" CHECK ((combatant_max_injury IS NULL OR combatant_max_injury >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_59" CHECK ((combatant_armor_pierce IS NULL OR combatant_armor_pierce >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_60" CHECK ((combatant_hit_chance IS NULL OR combatant_hit_chance >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_61" CHECK ((combatant_evasion IS NULL OR combatant_evasion >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_62" CHECK ((combatant_critical_chance IS NULL OR combatant_critical_chance >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_63" CHECK ((combatant_critical_multiplier IS NULL OR combatant_critical_multiplier >= 0)),
  CONSTRAINT "game_encounter_actor_state_check_64" CHECK ((dead IS NULL OR dead IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_65" CHECK ((dead IS NULL OR dead IN (1))),
  CONSTRAINT "game_encounter_actor_state_check_66" CHECK ((player IS NULL OR player IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_67" CHECK ((player IS NULL OR player IN (1))),
  CONSTRAINT "game_encounter_actor_state_check_68" CHECK ((enemy IS NULL OR enemy IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_69" CHECK ((enemy IS NULL OR enemy IN (1))),
  CONSTRAINT "game_encounter_actor_state_check_70" CHECK ((battle_a_i_present IS NULL OR battle_a_i_present IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_71" CHECK ((battle_a_i_config IS NULL OR json_valid(battle_a_i_config))),
  CONSTRAINT "game_encounter_actor_state_check_72" CHECK ((stat_source_present IS NULL OR stat_source_present IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_73" CHECK ((stat_source_level IS NULL OR stat_source_level >= 1)),
  CONSTRAINT "game_encounter_actor_state_check_74" CHECK ((stat_source_level IS NULL OR stat_source_level <= 200)),
  CONSTRAINT "game_encounter_actor_state_check_75" CHECK ((stat_source_growth_talent IS NULL OR stat_source_growth_talent IN ('warrior','archery','mage'))),
  CONSTRAINT "game_encounter_actor_state_check_76" CHECK ((stat_source_enchantments_present IS NULL OR stat_source_enchantments_present IN (0,1))),
  CONSTRAINT "game_encounter_actor_state_check_77" CHECK ((stat_source_titles_present IS NULL OR stat_source_titles_present IN (0,1)))
);
--> statement-breakpoint
CREATE TABLE "game_encounter_actor_state_cooldowns" (
  "character_id" text NOT NULL,
  "actor_id" text NOT NULL,
  "cooldowns_key" text NOT NULL,
  "content_version" text NOT NULL,
  "value" integer NOT NULL,
  PRIMARY KEY ("character_id","actor_id","cooldowns_key"),
  FOREIGN KEY ("character_id","actor_id") REFERENCES "game_encounter_actor_state" ("character_id","actor_id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","cooldowns_key") REFERENCES "game_content_skills" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_encounter_actor_state_cooldowns_check_0" CHECK ((value IS NULL OR value >= 0)),
  CONSTRAINT "game_encounter_actor_state_cooldowns_check_1" CHECK ((value IS NULL OR value <= 9007199254740991))
);
--> statement-breakpoint
CREATE TABLE "game_encounter_actor_state_inventory" (
  "character_id" text NOT NULL,
  "actor_id" text NOT NULL,
  "inventory_key" text NOT NULL,
  "content_version" text NOT NULL,
  "value" integer NOT NULL,
  PRIMARY KEY ("character_id","actor_id","inventory_key"),
  FOREIGN KEY ("character_id","actor_id") REFERENCES "game_encounter_actor_state" ("character_id","actor_id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","inventory_key") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_encounter_actor_state_inventory_check_0" CHECK ((value IS NULL OR value >= 1)),
  CONSTRAINT "game_encounter_actor_state_inventory_check_1" CHECK ((value IS NULL OR value <= 999))
);
--> statement-breakpoint
CREATE TABLE "game_encounter_actor_state_item_hotbar" (
  "character_id" text NOT NULL,
  "actor_id" text NOT NULL,
  "item_hotbar_position" integer NOT NULL,
  "content_version" text NOT NULL,
  "value" text NOT NULL,
  PRIMARY KEY ("character_id","actor_id","item_hotbar_position"),
  FOREIGN KEY ("character_id","actor_id") REFERENCES "game_encounter_actor_state" ("character_id","actor_id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","value") REFERENCES "game_content_items" ("content_version","definition_id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "game_encounter_actor_state_learned_skills" (
  "character_id" text NOT NULL,
  "actor_id" text NOT NULL,
  "learned_skills_key" text NOT NULL,
  "content_version" text NOT NULL,
  "value_rank" text NOT NULL,
  PRIMARY KEY ("character_id","actor_id","learned_skills_key"),
  FOREIGN KEY ("character_id","actor_id") REFERENCES "game_encounter_actor_state" ("character_id","actor_id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","learned_skills_key") REFERENCES "game_content_skills" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_encounter_actor_state_learned_skills_check_0" CHECK ((value_rank IS NULL OR value_rank IN ('1','2','3','4','5','6','7','8','9','F','E','D','C','B','A')))
);
--> statement-breakpoint
CREATE TABLE "game_encounter_actor_state_learned_skills_value_objective_counts" (
  "character_id" text NOT NULL,
  "actor_id" text NOT NULL,
  "learned_skills_key" text NOT NULL,
  "value_objective_counts_key" text NOT NULL,
  "content_version" text NOT NULL,
  "value" integer NOT NULL,
  PRIMARY KEY ("character_id","actor_id","learned_skills_key","value_objective_counts_key"),
  FOREIGN KEY ("character_id","actor_id","learned_skills_key") REFERENCES "game_encounter_actor_state_learned_skills" ("character_id","actor_id","learned_skills_key") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","learned_skills_key") REFERENCES "game_content_skills" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_encounter_actor_state_learned_skills_value_objective_counts_check_0" CHECK ((value IS NULL OR value >= 0)),
  CONSTRAINT "game_encounter_actor_state_learned_skills_value_objective_counts_check_1" CHECK ((value IS NULL OR value <= 1000))
);
--> statement-breakpoint
CREATE TABLE "game_encounter_actor_state_skills" (
  "character_id" text NOT NULL,
  "actor_id" text NOT NULL,
  "skills_position" integer NOT NULL,
  "content_version" text NOT NULL,
  "value" text NOT NULL,
  PRIMARY KEY ("character_id","actor_id","skills_position"),
  FOREIGN KEY ("character_id","actor_id") REFERENCES "game_encounter_actor_state" ("character_id","actor_id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","value") REFERENCES "game_content_skills" ("content_version","definition_id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "game_encounter_actor_state_sprite_idle_frames" (
  "character_id" text NOT NULL,
  "actor_id" text NOT NULL,
  "sprite_idle_frames_position" integer NOT NULL,
  "content_version" text NOT NULL,
  "value" integer NOT NULL,
  PRIMARY KEY ("character_id","actor_id","sprite_idle_frames_position"),
  FOREIGN KEY ("character_id","actor_id") REFERENCES "game_encounter_actor_state" ("character_id","actor_id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_encounter_actor_state_sprite_idle_frames_check_0" CHECK ((value IS NULL OR value >= 0)),
  CONSTRAINT "game_encounter_actor_state_sprite_idle_frames_check_1" CHECK ((value IS NULL OR value <= 9007199254740991))
);
--> statement-breakpoint
CREATE TABLE "game_encounter_actor_state_stat_source_effects" (
  "character_id" text NOT NULL,
  "actor_id" text NOT NULL,
  "stat_source_effects_position" integer NOT NULL,
  "content_version" text NOT NULL,
  "value_status_id" text NOT NULL,
  "value_stacks" integer NOT NULL,
  PRIMARY KEY ("character_id","actor_id","stat_source_effects_position"),
  FOREIGN KEY ("character_id","actor_id") REFERENCES "game_encounter_actor_state" ("character_id","actor_id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","value_status_id") REFERENCES "game_content_status_effects" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_encounter_actor_state_stat_source_effects_check_0" CHECK ((value_stacks IS NULL OR value_stacks >= 1)),
  CONSTRAINT "game_encounter_actor_state_stat_source_effects_check_1" CHECK ((value_stacks IS NULL OR value_stacks <= 10))
);
--> statement-breakpoint
CREATE TABLE "game_encounter_actor_state_stat_source_enchantments" (
  "character_id" text NOT NULL,
  "actor_id" text NOT NULL,
  "stat_source_enchantments_position" integer NOT NULL,
  "content_version" text NOT NULL,
  "value_source_id" text NOT NULL,
  "value_name" text NOT NULL,
  "value_stat" text NOT NULL,
  "value_value" integer NOT NULL,
  "value_active" integer NOT NULL,
  "value_condition" text NOT NULL,
  PRIMARY KEY ("character_id","actor_id","stat_source_enchantments_position"),
  FOREIGN KEY ("character_id","actor_id") REFERENCES "game_encounter_actor_state" ("character_id","actor_id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_encounter_actor_state_stat_source_enchantments_check_0" CHECK ((value_stat IS NULL OR value_stat IN ('strength','intelligence','dexterity','will','luck','maxHealth','maxMana','maxStamina','physicalAttack','magicAttack','defense','protection','magicDefense','magicProtection'))),
  CONSTRAINT "game_encounter_actor_state_stat_source_enchantments_check_1" CHECK ((value_value IS NULL OR value_value >= -1000)),
  CONSTRAINT "game_encounter_actor_state_stat_source_enchantments_check_2" CHECK ((value_value IS NULL OR value_value <= 1000)),
  CONSTRAINT "game_encounter_actor_state_stat_source_enchantments_check_3" CHECK ((value_active IS NULL OR value_active IN (0,1)))
);
--> statement-breakpoint
CREATE TABLE "game_encounter_actor_state_stat_source_learned_skills" (
  "character_id" text NOT NULL,
  "actor_id" text NOT NULL,
  "stat_source_learned_skills_key" text NOT NULL,
  "content_version" text NOT NULL,
  "value_rank" text NOT NULL,
  PRIMARY KEY ("character_id","actor_id","stat_source_learned_skills_key"),
  FOREIGN KEY ("character_id","actor_id") REFERENCES "game_encounter_actor_state" ("character_id","actor_id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","stat_source_learned_skills_key") REFERENCES "game_content_skills" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_encounter_actor_state_stat_source_learned_skills_check_0" CHECK ((value_rank IS NULL OR value_rank IN ('1','2','3','4','5','6','7','8','9','F','E','D','C','B','A')))
);
--> statement-breakpoint
CREATE TABLE "game_encounter_actor_state_stat_source_learned_skills_value_objective_counts" (
  "character_id" text NOT NULL,
  "actor_id" text NOT NULL,
  "stat_source_learned_skills_key" text NOT NULL,
  "value_objective_counts_key" text NOT NULL,
  "content_version" text NOT NULL,
  "value" integer NOT NULL,
  PRIMARY KEY ("character_id","actor_id","stat_source_learned_skills_key","value_objective_counts_key"),
  FOREIGN KEY ("character_id","actor_id","stat_source_learned_skills_key") REFERENCES "game_encounter_actor_state_stat_source_learned_skills" ("character_id","actor_id","stat_source_learned_skills_key") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","stat_source_learned_skills_key") REFERENCES "game_content_skills" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_encounter_actor_state_stat_source_learned_skills_value_objective_counts_check_0" CHECK ((value IS NULL OR value >= 0)),
  CONSTRAINT "game_encounter_actor_state_stat_source_learned_skills_value_objective_counts_check_1" CHECK ((value IS NULL OR value <= 1000))
);
--> statement-breakpoint
CREATE TABLE "game_encounter_actor_state_stat_source_titles" (
  "character_id" text NOT NULL,
  "actor_id" text NOT NULL,
  "stat_source_titles_position" integer NOT NULL,
  "content_version" text NOT NULL,
  "value_source_id" text NOT NULL,
  "value_name" text NOT NULL,
  "value_stat" text NOT NULL,
  "value_value" integer NOT NULL,
  "value_active" integer NOT NULL,
  "value_condition" text NOT NULL,
  PRIMARY KEY ("character_id","actor_id","stat_source_titles_position"),
  FOREIGN KEY ("character_id","actor_id") REFERENCES "game_encounter_actor_state" ("character_id","actor_id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_encounter_actor_state_stat_source_titles_check_0" CHECK ((value_stat IS NULL OR value_stat IN ('strength','intelligence','dexterity','will','luck','maxHealth','maxMana','maxStamina','physicalAttack','magicAttack','defense','protection','magicDefense','magicProtection'))),
  CONSTRAINT "game_encounter_actor_state_stat_source_titles_check_1" CHECK ((value_value IS NULL OR value_value >= -1000)),
  CONSTRAINT "game_encounter_actor_state_stat_source_titles_check_2" CHECK ((value_value IS NULL OR value_value <= 1000)),
  CONSTRAINT "game_encounter_actor_state_stat_source_titles_check_3" CHECK ((value_active IS NULL OR value_active IN (0,1)))
);
--> statement-breakpoint
CREATE TABLE "game_encounter_actor_state_statuses" (
  "character_id" text NOT NULL,
  "actor_id" text NOT NULL,
  "statuses_position" integer NOT NULL,
  "content_version" text NOT NULL,
  "value_id" text NOT NULL,
  "value_source_id" text NOT NULL,
  "value_remaining_turns" integer NOT NULL,
  "value_stacks" integer NOT NULL,
  PRIMARY KEY ("character_id","actor_id","statuses_position"),
  FOREIGN KEY ("character_id","actor_id") REFERENCES "game_encounter_actor_state" ("character_id","actor_id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("content_version","value_id") REFERENCES "game_content_status_effects" ("content_version","definition_id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "game_encounter_actor_state_statuses_check_0" CHECK ((value_remaining_turns IS NULL OR value_remaining_turns >= 0)),
  CONSTRAINT "game_encounter_actor_state_statuses_check_1" CHECK ((value_remaining_turns IS NULL OR value_remaining_turns <= 9007199254740991)),
  CONSTRAINT "game_encounter_actor_state_statuses_check_2" CHECK ((value_stacks IS NULL OR value_stacks >= 1)),
  CONSTRAINT "game_encounter_actor_state_statuses_check_3" CHECK ((value_stacks IS NULL OR value_stacks <= 10))
);
--> statement-breakpoint
CREATE TABLE "game_encounter_actor_state_weapon_prefix_values" (
  "character_id" text NOT NULL,
  "actor_id" text NOT NULL,
  "weapon_prefix_values_key" text NOT NULL,
  "content_version" text NOT NULL,
  "value" integer NOT NULL,
  PRIMARY KEY ("character_id","actor_id","weapon_prefix_values_key"),
  FOREIGN KEY ("character_id","actor_id") REFERENCES "game_encounter_actor_state" ("character_id","actor_id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_encounter_actor_state_weapon_prefix_values_check_0" CHECK ((value IS NULL OR value >= -1000)),
  CONSTRAINT "game_encounter_actor_state_weapon_prefix_values_check_1" CHECK ((value IS NULL OR value <= 1000))
);
--> statement-breakpoint
CREATE TABLE "game_encounter_actor_state_weapon_suffix_values" (
  "character_id" text NOT NULL,
  "actor_id" text NOT NULL,
  "weapon_suffix_values_key" text NOT NULL,
  "content_version" text NOT NULL,
  "value" integer NOT NULL,
  PRIMARY KEY ("character_id","actor_id","weapon_suffix_values_key"),
  FOREIGN KEY ("character_id","actor_id") REFERENCES "game_encounter_actor_state" ("character_id","actor_id") ON DELETE cascade ON UPDATE no action,
  FOREIGN KEY ("character_id","content_version") REFERENCES "game_characters" ("id","content_version") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_encounter_actor_state_weapon_suffix_values_check_0" CHECK ((value IS NULL OR value >= -1000)),
  CONSTRAINT "game_encounter_actor_state_weapon_suffix_values_check_1" CHECK ((value IS NULL OR value <= 1000))
);
--> statement-breakpoint
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
CREATE TRIGGER game_dungeon_blueprint_immutable
BEFORE UPDATE OF blueprint ON game_dungeon_runs
WHEN NEW.blueprint != OLD.blueprint
BEGIN
  SELECT RAISE(ABORT, 'immutable_dungeon_blueprint');
END;
--> statement-breakpoint
CREATE TRIGGER "game_content_atlases_immutable_insert" BEFORE INSERT ON "game_content_atlases" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_atlases_immutable_update" BEFORE UPDATE ON "game_content_atlases" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_atlases_immutable_delete" BEFORE DELETE ON "game_content_atlases" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_classes_immutable_insert" BEFORE INSERT ON "game_content_classes" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_classes_immutable_update" BEFORE UPDATE ON "game_content_classes" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_classes_immutable_delete" BEFORE DELETE ON "game_content_classes" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_classes_skills_immutable_insert" BEFORE INSERT ON "game_content_classes_skills" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_classes_skills_immutable_update" BEFORE UPDATE ON "game_content_classes_skills" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_classes_skills_immutable_delete" BEFORE DELETE ON "game_content_classes_skills" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_classes_sprite_idle_frames_immutable_insert" BEFORE INSERT ON "game_content_classes_sprite_idle_frames" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_classes_sprite_idle_frames_immutable_update" BEFORE UPDATE ON "game_content_classes_sprite_idle_frames" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_classes_sprite_idle_frames_immutable_delete" BEFORE DELETE ON "game_content_classes_sprite_idle_frames" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_dungeons_immutable_insert" BEFORE INSERT ON "game_content_dungeons" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_dungeons_immutable_update" BEFORE UPDATE ON "game_content_dungeons" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_dungeons_immutable_delete" BEFORE DELETE ON "game_content_dungeons" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_dungeons_companion_ids_immutable_insert" BEFORE INSERT ON "game_content_dungeons_companion_ids" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_dungeons_companion_ids_immutable_update" BEFORE UPDATE ON "game_content_dungeons_companion_ids" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_dungeons_companion_ids_immutable_delete" BEFORE DELETE ON "game_content_dungeons_companion_ids" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_dungeons_final_rewards_immutable_insert" BEFORE INSERT ON "game_content_dungeons_final_rewards" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_dungeons_final_rewards_immutable_update" BEFORE UPDATE ON "game_content_dungeons_final_rewards" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_dungeons_final_rewards_immutable_delete" BEFORE DELETE ON "game_content_dungeons_final_rewards" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_dungeons_fountain_ids_immutable_insert" BEFORE INSERT ON "game_content_dungeons_fountain_ids" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_dungeons_fountain_ids_immutable_update" BEFORE UPDATE ON "game_content_dungeons_fountain_ids" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_dungeons_fountain_ids_immutable_delete" BEFORE DELETE ON "game_content_dungeons_fountain_ids" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_dungeons_monster_ids_immutable_insert" BEFORE INSERT ON "game_content_dungeons_monster_ids" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_dungeons_monster_ids_immutable_update" BEFORE UPDATE ON "game_content_dungeons_monster_ids" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_dungeons_monster_ids_immutable_delete" BEFORE DELETE ON "game_content_dungeons_monster_ids" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_dungeons_ordinary_rewards_immutable_insert" BEFORE INSERT ON "game_content_dungeons_ordinary_rewards" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_dungeons_ordinary_rewards_immutable_update" BEFORE UPDATE ON "game_content_dungeons_ordinary_rewards" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_dungeons_ordinary_rewards_immutable_delete" BEFORE DELETE ON "game_content_dungeons_ordinary_rewards" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchanting_rules_immutable_insert" BEFORE INSERT ON "game_content_enchanting_rules" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchanting_rules_immutable_update" BEFORE UPDATE ON "game_content_enchanting_rules" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchanting_rules_immutable_delete" BEFORE DELETE ON "game_content_enchanting_rules" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchanting_rules_value_base_chance_bp_immutable_insert" BEFORE INSERT ON "game_content_enchanting_rules_value_base_chance_bp" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchanting_rules_value_base_chance_bp_immutable_update" BEFORE UPDATE ON "game_content_enchanting_rules_value_base_chance_bp" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchanting_rules_value_base_chance_bp_immutable_delete" BEFORE DELETE ON "game_content_enchanting_rules_value_base_chance_bp" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchanting_rules_value_powder_bonus_bp_immutable_insert" BEFORE INSERT ON "game_content_enchanting_rules_value_powder_bonus_bp" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchanting_rules_value_powder_bonus_bp_immutable_update" BEFORE UPDATE ON "game_content_enchanting_rules_value_powder_bonus_bp" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchanting_rules_value_powder_bonus_bp_immutable_delete" BEFORE DELETE ON "game_content_enchanting_rules_value_powder_bonus_bp" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchanting_rules_value_recipes_immutable_insert" BEFORE INSERT ON "game_content_enchanting_rules_value_recipes" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchanting_rules_value_recipes_immutable_update" BEFORE UPDATE ON "game_content_enchanting_rules_value_recipes" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchanting_rules_value_recipes_immutable_delete" BEFORE DELETE ON "game_content_enchanting_rules_value_recipes" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchants_immutable_insert" BEFORE INSERT ON "game_content_enchants" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchants_immutable_update" BEFORE UPDATE ON "game_content_enchants" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchants_immutable_delete" BEFORE DELETE ON "game_content_enchants" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchants_clauses_immutable_insert" BEFORE INSERT ON "game_content_enchants_clauses" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchants_clauses_immutable_update" BEFORE UPDATE ON "game_content_enchants_clauses" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchants_clauses_immutable_delete" BEFORE DELETE ON "game_content_enchants_clauses" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchants_clauses_value_conditions_immutable_insert" BEFORE INSERT ON "game_content_enchants_clauses_value_conditions" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchants_clauses_value_conditions_immutable_update" BEFORE UPDATE ON "game_content_enchants_clauses_value_conditions" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchants_clauses_value_conditions_immutable_delete" BEFORE DELETE ON "game_content_enchants_clauses_value_conditions" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchants_kinds_immutable_insert" BEFORE INSERT ON "game_content_enchants_kinds" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchants_kinds_immutable_update" BEFORE UPDATE ON "game_content_enchants_kinds" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchants_kinds_immutable_delete" BEFORE DELETE ON "game_content_enchants_kinds" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchants_tags_immutable_insert" BEFORE INSERT ON "game_content_enchants_tags" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchants_tags_immutable_update" BEFORE UPDATE ON "game_content_enchants_tags" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enchants_tags_immutable_delete" BEFORE DELETE ON "game_content_enchants_tags" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enemies_immutable_insert" BEFORE INSERT ON "game_content_enemies" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enemies_immutable_update" BEFORE UPDATE ON "game_content_enemies" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enemies_immutable_delete" BEFORE DELETE ON "game_content_enemies" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enemies_loot_immutable_insert" BEFORE INSERT ON "game_content_enemies_loot" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enemies_loot_immutable_update" BEFORE UPDATE ON "game_content_enemies_loot" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enemies_loot_immutable_delete" BEFORE DELETE ON "game_content_enemies_loot" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enemies_skills_immutable_insert" BEFORE INSERT ON "game_content_enemies_skills" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enemies_skills_immutable_update" BEFORE UPDATE ON "game_content_enemies_skills" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enemies_skills_immutable_delete" BEFORE DELETE ON "game_content_enemies_skills" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enemies_sprite_idle_frames_immutable_insert" BEFORE INSERT ON "game_content_enemies_sprite_idle_frames" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enemies_sprite_idle_frames_immutable_update" BEFORE UPDATE ON "game_content_enemies_sprite_idle_frames" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_enemies_sprite_idle_frames_immutable_delete" BEFORE DELETE ON "game_content_enemies_sprite_idle_frames" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_items_immutable_insert" BEFORE INSERT ON "game_content_items" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_items_immutable_update" BEFORE UPDATE ON "game_content_items" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_items_immutable_delete" BEFORE DELETE ON "game_content_items" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_items_weapon_tags_immutable_insert" BEFORE INSERT ON "game_content_items_weapon_tags" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_items_weapon_tags_immutable_update" BEFORE UPDATE ON "game_content_items_weapon_tags" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_items_weapon_tags_immutable_delete" BEFORE DELETE ON "game_content_items_weapon_tags" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_maps_immutable_insert" BEFORE INSERT ON "game_content_maps" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_maps_immutable_update" BEFORE UPDATE ON "game_content_maps" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_maps_immutable_delete" BEFORE DELETE ON "game_content_maps" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_maps_spawns_immutable_insert" BEFORE INSERT ON "game_content_maps_spawns" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_maps_spawns_immutable_update" BEFORE UPDATE ON "game_content_maps_spawns" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_maps_spawns_immutable_delete" BEFORE DELETE ON "game_content_maps_spawns" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quest_flags_immutable_insert" BEFORE INSERT ON "game_content_quest_flags" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quest_flags_immutable_update" BEFORE UPDATE ON "game_content_quest_flags" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quest_flags_immutable_delete" BEFORE DELETE ON "game_content_quest_flags" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_immutable_insert" BEFORE INSERT ON "game_content_quests" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_immutable_update" BEFORE UPDATE ON "game_content_quests" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_immutable_delete" BEFORE DELETE ON "game_content_quests" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_rewards_flags_immutable_insert" BEFORE INSERT ON "game_content_quests_rewards_flags" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_rewards_flags_immutable_update" BEFORE UPDATE ON "game_content_quests_rewards_flags" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_rewards_flags_immutable_delete" BEFORE DELETE ON "game_content_quests_rewards_flags" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_rewards_items_immutable_insert" BEFORE INSERT ON "game_content_quests_rewards_items" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_rewards_items_immutable_update" BEFORE UPDATE ON "game_content_quests_rewards_items" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_rewards_items_immutable_delete" BEFORE DELETE ON "game_content_quests_rewards_items" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_rewards_skills_immutable_insert" BEFORE INSERT ON "game_content_quests_rewards_skills" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_rewards_skills_immutable_update" BEFORE UPDATE ON "game_content_quests_rewards_skills" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_rewards_skills_immutable_delete" BEFORE DELETE ON "game_content_quests_rewards_skills" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_rewards_titles_immutable_insert" BEFORE INSERT ON "game_content_quests_rewards_titles" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_rewards_titles_immutable_update" BEFORE UPDATE ON "game_content_quests_rewards_titles" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_rewards_titles_immutable_delete" BEFORE DELETE ON "game_content_quests_rewards_titles" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_stages_immutable_insert" BEFORE INSERT ON "game_content_quests_stages" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_stages_immutable_update" BEFORE UPDATE ON "game_content_quests_stages" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_stages_immutable_delete" BEFORE DELETE ON "game_content_quests_stages" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_stages_value_objectives_immutable_insert" BEFORE INSERT ON "game_content_quests_stages_value_objectives" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_stages_value_objectives_immutable_update" BEFORE UPDATE ON "game_content_quests_stages_value_objectives" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_quests_stages_value_objectives_immutable_delete" BEFORE DELETE ON "game_content_quests_stages_value_objectives" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_shops_immutable_insert" BEFORE INSERT ON "game_content_shops" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_shops_immutable_update" BEFORE UPDATE ON "game_content_shops" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_shops_immutable_delete" BEFORE DELETE ON "game_content_shops" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_shops_bundles_immutable_insert" BEFORE INSERT ON "game_content_shops_bundles" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_shops_bundles_immutable_update" BEFORE UPDATE ON "game_content_shops_bundles" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_shops_bundles_immutable_delete" BEFORE DELETE ON "game_content_shops_bundles" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_shops_items_immutable_insert" BEFORE INSERT ON "game_content_shops_items" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_shops_items_immutable_update" BEFORE UPDATE ON "game_content_shops_items" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_shops_items_immutable_delete" BEFORE DELETE ON "game_content_shops_items" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_skill_book_recipes_immutable_insert" BEFORE INSERT ON "game_content_skill_book_recipes" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_skill_book_recipes_immutable_update" BEFORE UPDATE ON "game_content_skill_book_recipes" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_skill_book_recipes_immutable_delete" BEFORE DELETE ON "game_content_skill_book_recipes" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_skill_book_recipes_pages_immutable_insert" BEFORE INSERT ON "game_content_skill_book_recipes_pages" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_skill_book_recipes_pages_immutable_update" BEFORE UPDATE ON "game_content_skill_book_recipes_pages" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_skill_book_recipes_pages_immutable_delete" BEFORE DELETE ON "game_content_skill_book_recipes_pages" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_skills_immutable_insert" BEFORE INSERT ON "game_content_skills" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_skills_immutable_update" BEFORE UPDATE ON "game_content_skills" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_skills_immutable_delete" BEFORE DELETE ON "game_content_skills" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_skills_game_ranks_immutable_insert" BEFORE INSERT ON "game_content_skills_game_ranks" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_skills_game_ranks_immutable_update" BEFORE UPDATE ON "game_content_skills_game_ranks" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_skills_game_ranks_immutable_delete" BEFORE DELETE ON "game_content_skills_game_ranks" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_skills_game_ranks_value_objectives_immutable_insert" BEFORE INSERT ON "game_content_skills_game_ranks_value_objectives" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_skills_game_ranks_value_objectives_immutable_update" BEFORE UPDATE ON "game_content_skills_game_ranks_value_objectives" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_skills_game_ranks_value_objectives_immutable_delete" BEFORE DELETE ON "game_content_skills_game_ranks_value_objectives" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_skills_statuses_immutable_insert" BEFORE INSERT ON "game_content_skills_statuses" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_skills_statuses_immutable_update" BEFORE UPDATE ON "game_content_skills_statuses" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_skills_statuses_immutable_delete" BEFORE DELETE ON "game_content_skills_statuses" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_status_effects_immutable_insert" BEFORE INSERT ON "game_content_status_effects" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_status_effects_immutable_update" BEFORE UPDATE ON "game_content_status_effects" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_status_effects_immutable_delete" BEFORE DELETE ON "game_content_status_effects" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_titles_immutable_insert" BEFORE INSERT ON "game_content_titles" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_titles_immutable_update" BEFORE UPDATE ON "game_content_titles" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_titles_immutable_delete" BEFORE DELETE ON "game_content_titles" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_titles_effects_immutable_insert" BEFORE INSERT ON "game_content_titles_effects" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_titles_effects_immutable_update" BEFORE UPDATE ON "game_content_titles_effects" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_titles_effects_immutable_delete" BEFORE DELETE ON "game_content_titles_effects" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_worlds_immutable_insert" BEFORE INSERT ON "game_content_worlds" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_worlds_immutable_update" BEFORE UPDATE ON "game_content_worlds" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_worlds_immutable_delete" BEFORE DELETE ON "game_content_worlds" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_worlds_decorations_immutable_insert" BEFORE INSERT ON "game_content_worlds_decorations" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_worlds_decorations_immutable_update" BEFORE UPDATE ON "game_content_worlds_decorations" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_worlds_decorations_immutable_delete" BEFORE DELETE ON "game_content_worlds_decorations" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_worlds_objects_immutable_insert" BEFORE INSERT ON "game_content_worlds_objects" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_worlds_objects_immutable_update" BEFORE UPDATE ON "game_content_worlds_objects" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_worlds_objects_immutable_delete" BEFORE DELETE ON "game_content_worlds_objects" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_worlds_objects_value_lessons_immutable_insert" BEFORE INSERT ON "game_content_worlds_objects_value_lessons" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_worlds_objects_value_lessons_immutable_update" BEFORE UPDATE ON "game_content_worlds_objects_value_lessons" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_worlds_objects_value_lessons_immutable_delete" BEFORE DELETE ON "game_content_worlds_objects_value_lessons" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_worlds_objects_value_requires_cleared_immutable_insert" BEFORE INSERT ON "game_content_worlds_objects_value_requires_cleared" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_worlds_objects_value_requires_cleared_immutable_update" BEFORE UPDATE ON "game_content_worlds_objects_value_requires_cleared" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) OR EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=NEW.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER "game_content_worlds_objects_value_requires_cleared_immutable_delete" BEFORE DELETE ON "game_content_worlds_objects_value_requires_cleared" WHEN EXISTS (SELECT 1 FROM game_content_releases WHERE content_version=OLD.content_version AND published=1) BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER game_content_release_immutable_update BEFORE UPDATE ON game_content_releases WHEN OLD.published=1 OR NEW.content_version<>OLD.content_version OR NEW.checksum<>OLD.checksum OR NEW.schema_version<>OLD.schema_version BEGIN SELECT RAISE(ABORT,'Content release is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER game_content_release_immutable_delete BEFORE DELETE ON game_content_releases WHEN OLD.published=1 BEGIN SELECT RAISE(ABORT,'Published content is immutable'); END;
