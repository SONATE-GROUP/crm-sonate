CREATE TABLE `pending_leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`matched_company_id` integer,
	`matched_contact_id` integer,
	`raw_payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`matched_company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matched_contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `companies` ADD `enrichment_status` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `enrichment_data` text;