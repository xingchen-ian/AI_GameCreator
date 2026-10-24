CREATE TABLE `answer_submission_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`question_id` text NOT NULL,
	`answer_fingerprint` text NOT NULL,
	`design_snapshot_key` text NOT NULL,
	`requirement_status` text NOT NULL,
	`conflict_status` text NOT NULL,
	`feedback` text DEFAULT '' NOT NULL,
	`conflicts_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`confirmed_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `answer_submission_reviews_project_question_idx` ON `answer_submission_reviews` (`project_id`,`question_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `answer_submission_reviews_fingerprint_idx` ON `answer_submission_reviews` (`project_id`,`question_id`,`answer_fingerprint`);--> statement-breakpoint
CREATE TABLE `conversation_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`question_id` text NOT NULL,
	`through_message_id` text NOT NULL,
	`through_created_at` text NOT NULL,
	`message_count` integer NOT NULL,
	`summary` text NOT NULL,
	`structured_json` text DEFAULT '{}' NOT NULL,
	`model` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`through_message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_summaries_project_question_message_unique` ON `conversation_summaries` (`project_id`,`question_id`,`through_message_id`);--> statement-breakpoint
CREATE INDEX `conversation_summaries_project_question_idx` ON `conversation_summaries` (`project_id`,`question_id`,`through_created_at`);--> statement-breakpoint
CREATE TABLE `question_memories` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`question_id` text NOT NULL,
	`answer_revision` integer NOT NULL,
	`summary` text NOT NULL,
	`confirmed_decisions_json` text DEFAULT '[]' NOT NULL,
	`edited_adoptions_json` text DEFAULT '[]' NOT NULL,
	`explicit_rejections_json` text DEFAULT '[]' NOT NULL,
	`constraints_json` text DEFAULT '[]' NOT NULL,
	`open_questions_json` text DEFAULT '[]' NOT NULL,
	`unresolved_suggestions_json` text DEFAULT '[]' NOT NULL,
	`related_question_ids_json` text DEFAULT '[]' NOT NULL,
	`model` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `question_memories_project_question_revision_unique` ON `question_memories` (`project_id`,`question_id`,`answer_revision`);--> statement-breakpoint
CREATE INDEX `question_memories_project_question_idx` ON `question_memories` (`project_id`,`question_id`,`answer_revision`);