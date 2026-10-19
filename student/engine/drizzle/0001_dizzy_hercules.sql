CREATE TABLE `build_briefs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`gdd_version_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`markdown` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`gdd_version_id`) REFERENCES `gdd_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `build_briefs_project_version_unique` ON `build_briefs` (`project_id`,`version`);--> statement-breakpoint
CREATE INDEX `build_briefs_project_idx` ON `build_briefs` (`project_id`);--> statement-breakpoint
CREATE TABLE `design_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`answer_revisions_json` text NOT NULL,
	`answers_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `design_snapshots_project_idx` ON `design_snapshots` (`project_id`);--> statement-breakpoint
CREATE TABLE `gdd_issues` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`gdd_version_id` text NOT NULL,
	`severity` text NOT NULL,
	`issue_type` text NOT NULL,
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
	FOREIGN KEY (`gdd_version_id`) REFERENCES `gdd_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gdd_issues_version_idx` ON `gdd_issues` (`gdd_version_id`);--> statement-breakpoint
CREATE TABLE `gdd_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`title` text NOT NULL,
	`one_line_pitch` text NOT NULL,
	`sections_json` text NOT NULL,
	`confirmed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`snapshot_id`) REFERENCES `design_snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gdd_versions_project_version_unique` ON `gdd_versions` (`project_id`,`version`);--> statement-breakpoint
CREATE INDEX `gdd_versions_project_idx` ON `gdd_versions` (`project_id`);--> statement-breakpoint
CREATE TABLE `stage_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`stage_id` integer NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'current' NOT NULL,
	`summary` text NOT NULL,
	`key_decisions_json` text DEFAULT '[]' NOT NULL,
	`open_questions_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`snapshot_id`) REFERENCES `design_snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stage_summaries_project_stage_version_unique` ON `stage_summaries` (`project_id`,`stage_id`,`version`);--> statement-breakpoint
CREATE INDEX `stage_summaries_project_idx` ON `stage_summaries` (`project_id`);--> statement-breakpoint
ALTER TABLE `projects` ADD `gdd_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `build_brief_version` integer DEFAULT 0 NOT NULL;