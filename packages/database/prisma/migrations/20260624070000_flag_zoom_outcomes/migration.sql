-- Flag the built-in Zoom-style outcomes so selecting them prompts a Zoom
-- meeting to be scheduled. Idempotent — safe to re-run.
UPDATE "outcomes" SET "schedules_zoom" = true WHERE "slug" IN ('zoom', 'meeting_scheduled');
