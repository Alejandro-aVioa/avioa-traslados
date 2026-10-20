CREATE TABLE `gmail_test_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`status` text NOT NULL,
	`message_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
