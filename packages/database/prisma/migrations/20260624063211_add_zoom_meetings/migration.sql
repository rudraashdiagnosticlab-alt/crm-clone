-- CreateEnum
CREATE TYPE "ZoomMeetingStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled');

-- CreateTable
CREATE TABLE "zoom_meetings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" UUID NOT NULL,
    "organizer_id" UUID,
    "title" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_mins" INTEGER NOT NULL DEFAULT 30,
    "status" "ZoomMeetingStatus" NOT NULL DEFAULT 'scheduled',
    "join_url" TEXT,
    "meeting_id" TEXT,
    "passcode" TEXT,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "outcome" TEXT,
    "notes" TEXT,
    "summary" TEXT,
    "action_items" TEXT,
    "follow_up_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zoom_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "zoom_meetings_lead_id_idx" ON "zoom_meetings"("lead_id");

-- CreateIndex
CREATE INDEX "zoom_meetings_organizer_id_idx" ON "zoom_meetings"("organizer_id");

-- CreateIndex
CREATE INDEX "zoom_meetings_scheduled_at_idx" ON "zoom_meetings"("scheduled_at");

-- CreateIndex
CREATE INDEX "zoom_meetings_status_idx" ON "zoom_meetings"("status");

-- AddForeignKey
ALTER TABLE "zoom_meetings" ADD CONSTRAINT "zoom_meetings_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zoom_meetings" ADD CONSTRAINT "zoom_meetings_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
