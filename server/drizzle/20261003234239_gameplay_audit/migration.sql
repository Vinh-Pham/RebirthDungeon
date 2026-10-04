CREATE TABLE `audit_administrators` (
	`user_id` text PRIMARY KEY,
	`granted_at` integer NOT NULL,
	CONSTRAINT `fk_audit_administrators_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `audit_configuration` (
	`key` text PRIMARY KEY,
	`value` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_records` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT,
	`id` text NOT NULL UNIQUE,
	`timestamp` integer NOT NULL,
	`user_id` text,
	`character_id` text,
	`source` text NOT NULL,
	`category` text NOT NULL,
	`type` text NOT NULL,
	`outcome` text NOT NULL,
	`message` text NOT NULL,
	`command_id` text,
	`request_id` text,
	`revision` integer,
	`encounter_id` text,
	`occurred_at` integer,
	`dedupe_key` text,
	`details` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_dedupe_idx` ON `audit_records` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `audit_retention_idx` ON `audit_records` (`timestamp`);--> statement-breakpoint
CREATE INDEX `audit_character_idx` ON `audit_records` (`character_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `audit_user_idx` ON `audit_records` (`user_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `audit_command_idx` ON `audit_records` (`command_id`);--> statement-breakpoint
CREATE INDEX `audit_request_idx` ON `audit_records` (`request_id`);--> statement-breakpoint
CREATE INDEX `audit_encounter_idx` ON `audit_records` (`character_id`,`encounter_id`,`sequence`);
--> statement-breakpoint
INSERT INTO audit_configuration (key,value) VALUES ('recording_since',CAST(unixepoch('subsec')*1000 AS INTEGER));
--> statement-breakpoint
CREATE TRIGGER audit_records_immutable BEFORE UPDATE ON audit_records BEGIN SELECT RAISE(ABORT, 'Audit records are immutable'); END;

--> statement-breakpoint
CREATE TRIGGER audit_role_granted AFTER INSERT ON audit_administrators BEGIN
INSERT INTO audit_records (id,timestamp,user_id,source,category,type,outcome,message,details) VALUES (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6))),CAST(unixepoch('subsec')*1000 AS INTEGER),NEW.user_id,'server','system','ADMIN_ROLE_GRANTED','administration','Audit administrator membership granted.',json_object('version',1,'role','audit_admin'));
END;

--> statement-breakpoint
CREATE TRIGGER audit_role_revoked AFTER DELETE ON audit_administrators BEGIN
INSERT INTO audit_records (id,timestamp,user_id,source,category,type,outcome,message,details) VALUES (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6))),CAST(unixepoch('subsec')*1000 AS INTEGER),OLD.user_id,'server','system','ADMIN_ROLE_REVOKED','administration','Audit administrator membership revoked.',json_object('version',1,'role','audit_admin'));
END;
