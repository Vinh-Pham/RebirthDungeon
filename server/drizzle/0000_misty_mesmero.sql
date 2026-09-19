CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`experience` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `players_name_unique` ON `players` (`name`);
