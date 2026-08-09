-- AlterTable
ALTER TABLE "tenants" ALTER COLUMN "max_users" SET DEFAULT -1;
ALTER TABLE "tenants" ADD COLUMN "current_month_ai_tokens" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tenants" ADD COLUMN "last_token_reset_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
