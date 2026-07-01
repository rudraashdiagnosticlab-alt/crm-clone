-- AlterTable: per-caller OpenPhone/Quo number (admin-assigned; used as the SMS/dial "from").
ALTER TABLE "users" ADD COLUMN "openphone_number" TEXT;
