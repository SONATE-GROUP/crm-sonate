CREATE TABLE `conversation_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contact_id` integer NOT NULL,
	`channel` text NOT NULL,
	`direction` text NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`sent_at` integer NOT NULL,
	`external_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_messages_external_id_unique` ON `conversation_messages` (`external_id`);