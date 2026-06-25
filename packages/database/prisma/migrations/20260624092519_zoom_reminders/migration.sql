-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'zoom_scheduled';
ALTER TYPE "NotificationType" ADD VALUE 'zoom_reminder';
ALTER TYPE "NotificationType" ADD VALUE 'zoom_due';
ALTER TYPE "NotificationType" ADD VALUE 'zoom_cancelled';

-- AlterTable
ALTER TABLE "zoom_meetings" ADD COLUMN     "reminder_day_before_at" TIMESTAMP(3),
ADD COLUMN     "reminder_due_at" TIMESTAMP(3);
