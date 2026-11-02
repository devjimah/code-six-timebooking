CREATE TABLE `framework_agreements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`supplier_id` integer NOT NULL,
	`total_budget_cents` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `framework_agreements_code_unique` ON `framework_agreements` (`code`);--> statement-breakpoint
ALTER TABLE `orders` ADD `framework_agreement_id` integer REFERENCES framework_agreements(id);