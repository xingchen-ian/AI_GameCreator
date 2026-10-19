CREATE TABLE `design_review_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`message_id` text NOT NULL,
	`review_run_id` text NOT NULL,
	`issue_id` text NOT NULL,
	`target_question_id` text NOT NULL,
	`summary` text NOT NULL,
	`rationale` text NOT NULL,
	`before_content` text NOT NULL,
	`before_revision` integer NOT NULL,
	`proposed_content` text NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`applied_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`review_run_id`) REFERENCES `design_review_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`issue_id`) REFERENCES `design_review_issues`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `design_review_changes_project_idx` ON `design_review_changes` (`project_id`);--> statement-breakpoint
CREATE INDEX `design_review_changes_message_idx` ON `design_review_changes` (`message_id`);--> statement-breakpoint
CREATE INDEX `design_review_changes_run_idx` ON `design_review_changes` (`review_run_id`);--> statement-breakpoint
CREATE TABLE `design_review_issues` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`first_seen_run_id` text NOT NULL,
	`last_seen_run_id` text NOT NULL,
	`severity` text NOT NULL,
	`title` text NOT NULL,
	`evidence` text NOT NULL,
	`why_it_matters` text NOT NULL,
	`question_ids_json` text DEFAULT '[]' NOT NULL,
	`options_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolution_note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`first_seen_run_id`) REFERENCES `design_review_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`last_seen_run_id`) REFERENCES `design_review_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `design_review_issues_project_idx` ON `design_review_issues` (`project_id`);--> statement-breakpoint
CREATE INDEX `design_review_issues_last_run_idx` ON `design_review_issues` (`last_seen_run_id`);--> statement-breakpoint
CREATE TABLE `design_review_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version` integer NOT NULL,
	`snapshot_key` text NOT NULL,
	`answers_json` text NOT NULL,
	`status` text DEFAULT 'reviewing' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `design_review_runs_project_version_unique` ON `design_review_runs` (`project_id`,`version`);--> statement-breakpoint
CREATE INDEX `design_review_runs_project_idx` ON `design_review_runs` (`project_id`);--> statement-breakpoint
CREATE TABLE `design_review_verdicts` (
	`id` text PRIMARY KEY NOT NULL,
	`review_run_id` text NOT NULL,
	`issue_id` text NOT NULL,
	`verdict` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`review_run_id`) REFERENCES `design_review_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`issue_id`) REFERENCES `design_review_issues`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `design_review_verdicts_run_idx` ON `design_review_verdicts` (`review_run_id`);--> statement-breakpoint
ALTER TABLE `gdd_versions` ADD `fidelity_status` text DEFAULT 'ready' NOT NULL;