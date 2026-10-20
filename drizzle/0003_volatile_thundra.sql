CREATE TABLE `whatsapp_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`transfer_id` text NOT NULL,
	`version` integer NOT NULL,
	`preview_hash` text NOT NULL,
	`instance` text NOT NULL,
	`origin` text NOT NULL,
	`number` text NOT NULL,
	`status` text NOT NULL,
	`message_id` text,
	`attempt` integer DEFAULT 1 NOT NULL,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`transfer_id`) REFERENCES `transfers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `whatsapp_transfer_owner_version` ON `whatsapp_deliveries` (`owner_id`,`transfer_id`,`version`);