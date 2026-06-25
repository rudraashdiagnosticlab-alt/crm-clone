-- CreateTable
CREATE TABLE "zoom_meeting_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "meeting_id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zoom_meeting_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "zoom_meeting_activities_meeting_id_idx" ON "zoom_meeting_activities"("meeting_id");

-- CreateIndex
CREATE INDEX "zoom_meeting_activities_created_at_idx" ON "zoom_meeting_activities"("created_at");

-- AddForeignKey
ALTER TABLE "zoom_meeting_activities" ADD CONSTRAINT "zoom_meeting_activities_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "zoom_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zoom_meeting_activities" ADD CONSTRAINT "zoom_meeting_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
