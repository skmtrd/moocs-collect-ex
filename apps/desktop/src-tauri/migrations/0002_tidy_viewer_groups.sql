ALTER TABLE `lectures` ADD COLUMN `group_name` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `lectures` ADD COLUMN `group_index` integer DEFAULT 0 NOT NULL;
