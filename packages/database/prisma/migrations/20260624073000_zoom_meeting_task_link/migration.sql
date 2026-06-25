-- Link a Zoom meeting to its auto-created Task (one-to-one).
ALTER TABLE "zoom_meetings" ADD COLUMN "task_id" UUID;

CREATE UNIQUE INDEX "zoom_meetings_task_id_key" ON "zoom_meetings"("task_id");

ALTER TABLE "zoom_meetings"
  ADD CONSTRAINT "zoom_meetings_task_id_fkey"
  FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
