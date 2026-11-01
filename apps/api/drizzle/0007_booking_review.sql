ALTER TABLE `time_entries` ADD `status` text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE `time_entries` ADD `return_reason` text;