CREATE TABLE `enrichment_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`enrichment_type` text NOT NULL,
	`status` text NOT NULL,
	`result_data` text,
	`error_message` text,
	`credits_used` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `contacts` ADD `linkedin_url` text;--> statement-breakpoint
ALTER TABLE `companies` DROP COLUMN `enrichment_status`;--> statement-breakpoint
ALTER TABLE `companies` DROP COLUMN `enrichment_data`;