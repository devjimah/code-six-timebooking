ALTER TABLE `audit_events` ADD `action` text;--> statement-breakpoint
ALTER TABLE `audit_events` ADD `target_type` text;--> statement-breakpoint
ALTER TABLE `audit_events` ADD `target_id` integer;--> statement-breakpoint
ALTER TABLE `audit_events` ADD `error_code` text;--> statement-breakpoint
ALTER TABLE `audit_events` ADD `details` text;--> statement-breakpoint
ALTER TABLE `audit_events` ADD `ip_address` text;--> statement-breakpoint
ALTER TABLE `audit_events` ADD `user_agent` text;