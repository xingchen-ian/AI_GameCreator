CREATE TABLE `study_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`access_token_hash` text NOT NULL,
	`owner_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_participants_code_unique` ON `study_participants` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `study_participants_token_unique` ON `study_participants` (`access_token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `study_participants_owner_unique` ON `study_participants` (`owner_id`);--> statement-breakpoint
CREATE INDEX `study_participants_status_idx` ON `study_participants` (`status`);