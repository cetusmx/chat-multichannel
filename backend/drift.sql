-- CreateEnum
CREATE TYPE "license_type" AS ENUM ('SUBSCRIPTION', 'LIFETIME');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "license_type" "license_type" NOT NULL DEFAULT 'LIFETIME',
ADD COLUMN     "max_ai_tokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "max_users" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "subscription_end_date" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "idx_tenant_license_end_date" ON "tenants"("license_type", "subscription_end_date");

