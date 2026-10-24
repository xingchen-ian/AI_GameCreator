CREATE TABLE `background_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`type` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`available_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `background_jobs_dedupe_unique` ON `background_jobs` (`project_id`,`type`,`dedupe_key`);--> statement-breakpoint
CREATE INDEX `background_jobs_status_available_idx` ON `background_jobs` (`status`,`available_at`);--> statement-breakpoint
CREATE INDEX `background_jobs_project_idx` ON `background_jobs` (`project_id`,`created_at`);