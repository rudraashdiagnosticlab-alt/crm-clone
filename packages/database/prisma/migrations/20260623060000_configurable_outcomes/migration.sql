-- Configurable call outcomes: convert calls.outcome enum → text, add outcomes table, seed it.

-- 1) Preserve existing data while changing the column type.
ALTER TABLE "calls" ALTER COLUMN "outcome" TYPE TEXT USING "outcome"::text;

-- 2) Drop the now-unused enum type.
DROP TYPE "CallOutcome";

-- 3) Admin-configurable outcomes table.
CREATE TABLE "outcomes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#6b7359',
  "schedules_callback" BOOLEAN NOT NULL DEFAULT false,
  "lead_status" "LeadStatus",
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "outcomes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "outcomes_slug_key" ON "outcomes"("slug");

-- 4) Seed the outcome list (idempotent on slug).
INSERT INTO "outcomes" ("slug","name","color","schedules_callback","lead_status","sort_order","updated_at") VALUES
  ('answering_machine','Answering Machine','#6b7359',false,'in_progress',10,CURRENT_TIMESTAMP),
  ('call_back','Call Back','#c98a18',true,'contacted',20,CURRENT_TIMESTAMP),
  ('disconnected','Disconnected Calls','#6b7359',false,'in_progress',30,CURRENT_TIMESTAMP),
  ('email','Email','#2c5d8f',false,'contacted',40,CURRENT_TIMESTAMP),
  ('dm_not_interested','Dm-Not Interested','#c0392b',false,'rejected',50,CURRENT_TIMESTAMP),
  ('not_interested','Not Interested','#c0392b',false,'rejected',60,CURRENT_TIMESTAMP),
  ('not_available','Not Available','#6b7359',false,'in_progress',70,CURRENT_TIMESTAMP),
  ('no_answer','No Answer','#6b7359',false,'in_progress',80,CURRENT_TIMESTAMP),
  ('opposite_call_back','Opposite Call Back','#c98a18',true,'contacted',90,CURRENT_TIMESTAMP),
  ('voice_mail','Voice Mail','#6b7359',false,'in_progress',100,CURRENT_TIMESTAMP),
  ('wrong_number','Wrong Number','#6b7359',false,'rejected',110,CURRENT_TIMESTAMP),
  ('meeting_scheduled','Meeting Scheduled','#2f6f63',false,'interested',120,CURRENT_TIMESTAMP),
  ('zoom','Zoom','#3f7a32',false,'interested',130,CURRENT_TIMESTAMP),
  ('follow_up_required','Follow-up Required','#6b7359',false,'contacted',140,CURRENT_TIMESTAMP),
  ('negotiation','Negotiation','#b7791f',false,'interested',150,CURRENT_TIMESTAMP),
  ('closed_won','Closed-Won','#2e7d32',false,'closed',160,CURRENT_TIMESTAMP),
  ('closed_lost','Closed-Lost','#9e2b21',false,'rejected',170,CURRENT_TIMESTAMP),
  ('follow_up_1','Follow-up 1','#6b7359',false,'contacted',180,CURRENT_TIMESTAMP),
  ('follow_up_2','Follow-up 2','#6b7359',false,'contacted',190,CURRENT_TIMESTAMP),
  ('follow_up_3','Follow-up 3','#6b7359',false,'contacted',200,CURRENT_TIMESTAMP),
  ('follow_up_4','Follow-up 4','#6b7359',false,'contacted',210,CURRENT_TIMESTAMP),
  ('follow_up_5','Follow-up 5','#6b7359',false,'contacted',220,CURRENT_TIMESTAMP),
  ('dormant','Dormant','#7c3aed',false,'in_progress',230,CURRENT_TIMESTAMP),
  ('do_not_disturb','Do Not Disturb','#2563eb',false,'rejected',240,CURRENT_TIMESTAMP),
  ('do_not_contact','Do Not Contact','#db2777',false,'rejected',250,CURRENT_TIMESTAMP);
