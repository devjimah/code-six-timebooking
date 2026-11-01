-- ADR 0010: bookings store start time, end time and break. Edited by hand after `drizzle-kit generate`:
-- SQLite cannot add a NOT NULL column to a table with rows unless it has a default, so existing bookings
-- start at 09:00 with no break and end after their stored duration (at most 10 h, so 19:00 at the latest).
ALTER TABLE `time_entries` ADD `start_time` text DEFAULT '09:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `time_entries` ADD `end_time` text DEFAULT '09:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `time_entries` ADD `break_minutes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `time_entries` SET `end_time` = printf('%02d:%02d', (540 + `duration_minutes`) / 60, (540 + `duration_minutes`) % 60);
