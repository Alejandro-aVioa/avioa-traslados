CREATE TABLE `email_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`transfer_id` text NOT NULL,
	`version` integer NOT NULL,
	`preview_hash` text NOT NULL,
	`sender` text NOT NULL,
	`recipients` text NOT NULL,
	`status` text NOT NULL,
	`message_id` text,
	`attempt` integer DEFAULT 1 NOT NULL,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`transfer_id`) REFERENCES `transfers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_transfer_owner_version` ON `email_deliveries` (`owner_id`,`transfer_id`,`version`);--> statement-breakpoint
CREATE TABLE `gmail_connections` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`refresh_token` text NOT NULL,
	`status` text DEFAULT 'connected' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gmail_oauth_states` (
	`state_hash` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`verifier` text NOT NULL,
	`expires_at` text NOT NULL
);
