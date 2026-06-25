-- AlterTable
ALTER TABLE "outcomes" ADD COLUMN     "schedules_zoom" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "zoom_meetings" ADD COLUMN     "agenda" TEXT,
ADD COLUMN     "client_feedback" TEXT,
ADD COLUMN     "decisions" TEXT,
ADD COLUMN     "participants" TEXT,
ADD COLUMN     "reason" TEXT;
