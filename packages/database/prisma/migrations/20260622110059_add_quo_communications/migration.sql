-- CreateEnum
CREATE TYPE "CommDirection" AS ENUM ('inbound', 'outbound');

-- AlterTable
ALTER TABLE "calls" ADD COLUMN     "ai_summary" TEXT,
ADD COLUMN     "conversation_id" TEXT,
ADD COLUMN     "direction" "CommDirection",
ADD COLUMN     "quo_call_id" TEXT,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "transcript" TEXT;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "last_communication_at" TIMESTAMP(3),
ADD COLUMN     "quo_contact_id" TEXT;

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" UUID,
    "direction" "CommDirection" NOT NULL,
    "body" TEXT NOT NULL,
    "from_number" TEXT NOT NULL,
    "to_number" TEXT NOT NULL,
    "status" TEXT,
    "quo_message_id" TEXT,
    "conversation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_lead_id_idx" ON "messages"("lead_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");

-- CreateIndex
CREATE INDEX "messages_quo_message_id_idx" ON "messages"("quo_message_id");

-- CreateIndex
CREATE INDEX "calls_quo_call_id_idx" ON "calls"("quo_call_id");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
