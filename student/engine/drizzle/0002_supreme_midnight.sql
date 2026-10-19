ALTER TABLE `projects` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `archived_at` text;--> statement-breakpoint
CREATE INDEX `projects_owner_status_idx` ON `projects` (`owner_id`,`status`);