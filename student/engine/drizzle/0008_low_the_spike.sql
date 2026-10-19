CREATE TABLE `research_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `research_participants_owner_unique` ON `research_participants` (`owner_id`);--> statement-breakpoint
ALTER TABLE `model_calls` ADD `app_version` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `model_calls` ADD `prompt_version` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `model_calls` ADD `schema_version` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `model_calls` ADD `temperature` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `model_calls` ADD `thinking_enabled` integer DEFAULT false NOT NULL;