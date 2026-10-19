CREATE TABLE `providers` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`destination` text NOT NULL,
	`name` text NOT NULL,
	`channel` text NOT NULL,
	`contact` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `providers_owner_destination` ON `providers` (`owner_id`,`destination`);--> statement-breakpoint
CREATE TABLE `transfer_events` (
	`id` text PRIMARY KEY NOT NULL,
	`transfer_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`transfer_id`) REFERENCES `transfers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `events_transfer_owner` ON `transfer_events` (`transfer_id`,`owner_id`);--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`reservation` text NOT NULL,
	`holder` text NOT NULL,
	`phone` text NOT NULL,
	`advisor` text NOT NULL,
	`destination` text NOT NULL,
	`hotel` text NOT NULL,
	`passengers` integer NOT NULL,
	`infants` integer NOT NULL,
	`arrival_airline` text NOT NULL,
	`arrival_flight` text NOT NULL,
	`arrival_date` text NOT NULL,
	`arrival_time` text NOT NULL,
	`return_airline` text NOT NULL,
	`return_flight` text NOT NULL,
	`return_date` text NOT NULL,
	`return_time` text NOT NULL,
	`includes_tours` integer NOT NULL,
	`tour_notes` text NOT NULL,
	`notes` text NOT NULL,
	`status` text DEFAULT 'Pendiente' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `transfers_owner_created` ON `transfers` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `transfers_owner_status` ON `transfers` (`owner_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `transfers_owner_reservation` ON `transfers` (`owner_id`,`reservation`);