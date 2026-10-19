CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`question_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `messages_project_question_idx` ON `messages` (`project_id`,`question_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`owner_email` text NOT NULL,
	`title` text DEFAULT '未命名游戏' NOT NULL,
	`active_question_id` text DEFAULT 'Q1' NOT NULL,
	`prototype_version` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `projects_owner_idx` ON `projects` (`owner_id`);--> statement-breakpoint
CREATE TABLE `prototype_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`game_spec_json` text NOT NULL,
	`design_snapshot_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prototype_versions_project_version_unique` ON `prototype_versions` (`project_id`,`version`);--> statement-breakpoint
CREATE INDEX `prototype_versions_project_idx` ON `prototype_versions` (`project_id`);--> statement-breakpoint
CREATE TABLE `question_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`question_id` text NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`answer` text NOT NULL,
	`structured_json` text DEFAULT '{}' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `question_answers_project_question_unique` ON `question_answers` (`project_id`,`question_id`);--> statement-breakpoint
CREATE INDEX `question_answers_project_idx` ON `question_answers` (`project_id`);