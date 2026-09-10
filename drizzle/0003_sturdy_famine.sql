CREATE TABLE `calculation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`record_id` text NOT NULL,
	`rule_id` text NOT NULL,
	`rule_version` integer NOT NULL,
	`data` text NOT NULL,
	`created_by` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `entity_relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`source_id` text NOT NULL,
	`target_id` text NOT NULL,
	`source_type` text NOT NULL,
	`target_type` text NOT NULL,
	`relationship_type` text NOT NULL,
	`status` text NOT NULL,
	`origin` text NOT NULL,
	`confidence` real NOT NULL,
	`evidence` text NOT NULL,
	`source_line` text DEFAULT '' NOT NULL,
	`target_line` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `relationships_scope` ON `entity_relationships` (`tenant_id`,`source_id`,`target_id`);--> statement-breakpoint
CREATE TABLE `record_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`record_id` text NOT NULL,
	`version` integer NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL
);

--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS preserve_record_version BEFORE UPDATE OF data ON records BEGIN INSERT INTO record_versions VALUES(lower(hex(randomblob(16))),OLD.tenant_id,OLD.id,OLD.version,OLD.data,strftime('%Y-%m-%dT%H:%M:%fZ','now')); END;

--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS record_versions_no_update BEFORE UPDATE ON record_versions BEGIN SELECT RAISE(ABORT,'Versions cannot be changed'); END;

--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS record_versions_no_delete BEFORE DELETE ON record_versions BEGIN SELECT RAISE(ABORT,'Versions cannot be deleted'); END;
