CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`record_id` text,
	`kind` text NOT NULL,
	`detail` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_scope` ON `audit` (`tenant_id`,`created`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`email` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notification_reads` (
	`user_id` text NOT NULL,
	`record_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `record_id`)
);
--> statement-breakpoint
CREATE TABLE `posting_guards` (
	`id` text PRIMARY KEY NOT NULL,
	`expected` integer NOT NULL,
	`actual` integer NOT NULL,
	CONSTRAINT "posting_version_match" CHECK("posting_guards"."expected"="posting_guards"."actual")
);
--> statement-breakpoint
CREATE TABLE `preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`kind` text NOT NULL,
	`fy` text NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `records_scope` ON `records` (`tenant_id`,`kind`,`fy`);--> statement-breakpoint
CREATE UNIQUE INDEX operation_reference ON records (tenant_id,kind,json_extract(data,'$.reference')) WHERE json_extract(data,'$.operation')=1 AND json_extract(data,'$.reference')<>'';--> statement-breakpoint
CREATE UNIQUE INDEX operation_serial ON records (tenant_id,json_extract(data,'$.serialNumber')) WHERE kind='machines';--> statement-breakpoint
CREATE UNIQUE INDEX operation_currency ON records (tenant_id,json_extract(data,'$.code')) WHERE kind='master-currency';--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_balances` (
	`tenant_id` text NOT NULL,
	`product_id` text NOT NULL,
	`warehouse_id` text NOT NULL,
	`currency` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`tenant_id`, `product_id`, `warehouse_id`, `currency`),
	CONSTRAINT "stock_quantity_nonnegative" CHECK("stock_balances"."quantity">=0),
	CONSTRAINT "stock_value_nonnegative" CHECK("stock_balances"."value">=0)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'Admin' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
--> statement-breakpoint
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'Audit events cannot be changed'); END;
--> statement-breakpoint
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'Audit events cannot be deleted'); END;
