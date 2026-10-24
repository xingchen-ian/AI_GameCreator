ALTER TABLE `question_memories` ADD `base_memory_id` text;--> statement-breakpoint
ALTER TABLE `question_memories` ADD `through_message_id` text REFERENCES messages(id);--> statement-breakpoint
ALTER TABLE `question_memories` ADD `through_created_at` text;