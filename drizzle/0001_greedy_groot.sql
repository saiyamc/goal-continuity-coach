CREATE TABLE `goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(240) NOT NULL,
	`fullAction` text NOT NULL,
	`shortAction` text NOT NULL,
	`emergencyAction` text NOT NULL,
	`reminderEmail` varchar(320),
	`reminderEnabled` int NOT NULL DEFAULT 0,
	`reminderTime` varchar(5) NOT NULL DEFAULT '20:00',
	`reminderTimezone` varchar(80) NOT NULL DEFAULT 'Asia/Kolkata',
	`scheduleCronTaskUid` varchar(65),
	`lastCompletedAt` timestamp,
	`lastReminderAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `goals_id` PRIMARY KEY(`id`)
);
