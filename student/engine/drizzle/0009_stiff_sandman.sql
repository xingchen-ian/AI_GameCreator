ALTER TABLE `model_calls` ADD `context_strategy` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `model_calls` ADD `included_answer_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `model_calls` ADD `included_message_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `model_calls` ADD `estimated_context_tokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `model_calls` ADD `context_truncated` integer DEFAULT false NOT NULL;