CREATE TABLE `audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`occurred_at` text NOT NULL,
	`actor_user_id` integer,
	`actor_role` text,
	`method` text NOT NULL,
	`route` text NOT NULL,
	`path` text NOT NULL,
	`status_code` integer NOT NULL,
	`outcome` text NOT NULL,
	`duration_ms` integer NOT NULL
);
