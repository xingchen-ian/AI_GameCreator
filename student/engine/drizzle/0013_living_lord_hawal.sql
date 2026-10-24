CREATE TABLE `study_events` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`session_id` text NOT NULL,
	`actor` text NOT NULL,
	`event_type` text NOT NULL,
	`question_id` text,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`occurred_at` text NOT NULL,
	`received_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `study_events_project_time_idx` ON `study_events` (`project_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `study_events_session_time_idx` ON `study_events` (`session_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `study_events_type_idx` ON `study_events` (`event_type`);--> statement-breakpoint
ALTER TABLE `model_calls` ADD `attempts_json` text DEFAULT '[]' NOT NULL;