-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "comments" TEXT,
ADD COLUMN     "contact_name" TEXT,
ADD COLUMN     "employee_code" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "lead_category" TEXT,
ADD COLUMN     "next_follow_up_date" TIMESTAMP(3),
ADD COLUMN     "title" TEXT,
ADD COLUMN     "vlc" TEXT;
