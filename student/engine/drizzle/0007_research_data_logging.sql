CREATE TABLE `ai_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`question_id` text NOT NULL,
	`source` text NOT NULL,
	`message_id` text,
	`suggested_answer` text NOT NULL,
	`structured_json` text DEFAULT '{}' NOT NULL,
	`model` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ai_suggestions_project_question_idx` ON `ai_suggestions` (`project_id`,`question_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `answer_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`question_id` text NOT NULL,
	`revision` integer NOT NULL,
	`answer` text NOT NULL,
	`source` text NOT NULL,
	`suggestion_id` text,
	`adoption` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`suggestion_id`) REFERENCES `ai_suggestions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `answer_revisions_project_question_revision_unique` ON `answer_revisions` (`project_id`,`question_id`,`revision`);--> statement-breakpoint
CREATE INDEX `answer_revisions_project_idx` ON `answer_revisions` (`project_id`);--> statement-breakpoint
CREATE TABLE `model_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`operation` text NOT NULL,
	`role` text NOT NULL,
	`model` text NOT NULL,
	`outcome` text NOT NULL,
	`strict_fallback` integer DEFAULT false NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`duration_ms` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `model_calls_project_idx` ON `model_calls` (`project_id`,`created_at`);--> statement-breakpoint
-- 把现有答案作为各自当前修订号的历史起点；更早的修订在此之前没有保存，无法恢复。
INSERT INTO `answer_revisions` (`id`, `project_id`, `question_id`, `revision`, `answer`, `source`, `suggestion_id`, `adoption`, `created_at`)
SELECT lower(hex(randomblob(16))), `project_id`, `question_id`, `revision`, `answer`, 'backfill', NULL, NULL, `updated_at`
FROM `question_answers`;
