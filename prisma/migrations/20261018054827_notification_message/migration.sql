-- Notification text, so announcements and reminders can carry a message (2a.12).
ALTER TABLE "Notification" ADD COLUMN "message" TEXT NOT NULL DEFAULT '';
