-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'callback_reminder';
ALTER TYPE "NotificationType" ADD VALUE 'callback_due';
ALTER TYPE "NotificationType" ADD VALUE 'callback_missed';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "callback_at" TIMESTAMP(3),
ADD COLUMN     "callback_completed_at" TIMESTAMP(3),
ADD COLUMN     "callback_reminder_day_before_at" TIMESTAMP(3),
ADD COLUMN     "callback_reminder_due_at" TIMESTAMP(3),
ADD COLUMN     "callback_reminder_missed_at" TIMESTAMP(3);
