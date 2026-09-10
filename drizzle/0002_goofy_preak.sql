CREATE TABLE `workbook_facts` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`domain` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workbook_facts_scope` ON `workbook_facts` (`tenant_id`,`batch_id`,`domain`);--> statement-breakpoint
CREATE TABLE `workbook_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`filename` text NOT NULL,
	`sha256` text NOT NULL,
	`metadata` text NOT NULL,
	`original` blob NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workbook_imports_source` ON `workbook_imports` (`tenant_id`,`sha256`);--> statement-breakpoint
CREATE TABLE `workbook_rows` (
	`batch_id` text NOT NULL,
	`sheet_index` integer NOT NULL,
	`row_number` integer NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`batch_id`, `sheet_index`, `row_number`)
);
--> statement-breakpoint
CREATE TABLE `workbook_sheets` (
	`batch_id` text NOT NULL,
	`sheet_index` integer NOT NULL,
	`name` text NOT NULL,
	`metadata` text NOT NULL,
	PRIMARY KEY(`batch_id`, `sheet_index`)
);
