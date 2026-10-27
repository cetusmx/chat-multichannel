-- AlterTable
ALTER TABLE "conversations" ADD COLUMN "ai_summary" TEXT,
ADD COLUMN "ai_summary_updated_at" TIMESTAMP(3);
