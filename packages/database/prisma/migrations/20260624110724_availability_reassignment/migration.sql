-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('online', 'offline');

-- CreateEnum
CREATE TYPE "ReassignType" AS ENUM ('call', 'callback', 'followup', 'zoom', 'task');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "availability" "Availability" NOT NULL DEFAULT 'online',
ADD COLUMN     "availability_reason" TEXT,
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "no_login_handled_on" DATE,
ADD COLUMN     "shift_start" TEXT;

-- CreateTable
CREATE TABLE "work_reassignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "ReassignType" NOT NULL,
    "reason" TEXT NOT NULL,
    "from_user" UUID NOT NULL,
    "from_user_name" TEXT NOT NULL,
    "to_user" UUID NOT NULL,
    "lead_id" UUID,
    "zoom_meeting_id" UUID,
    "task_id" UUID,
    "client_name" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_reassignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_reassignments_to_user_acknowledged_idx" ON "work_reassignments"("to_user", "acknowledged");

-- CreateIndex
CREATE INDEX "work_reassignments_created_at_idx" ON "work_reassignments"("created_at");
