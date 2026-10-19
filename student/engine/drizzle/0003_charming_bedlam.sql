CREATE TABLE `gdd_review_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`message_id` text NOT NULL,
	`gdd_version_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`issue_ids_json` text DEFAULT '[]' NOT NULL,
	`summary` text NOT NULL,
	`rationale` text NOT NULL,
	`before_content` text NOT NULL,
	`proposed_content` text NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`applied_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`gdd_version_id`) REFERENCES `gdd_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gdd_review_changes_project_idx` ON `gdd_review_changes` (`project_id`);--> statement-breakpoint
CREATE INDEX `gdd_review_changes_message_idx` ON `gdd_review_changes` (`message_id`);