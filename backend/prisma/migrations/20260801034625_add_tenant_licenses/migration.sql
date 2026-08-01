-- CreateEnum
CREATE TYPE "license_type" AS ENUM ('SUBSCRIPTION', 'LIFETIME');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "license_type" "license_type" NOT NULL DEFAULT 'LIFETIME',
ADD COLUMN     "max_ai_tokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "max_users" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "subscription_end_date" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "idx_tenant_license_end_date" ON "tenants"("license_type", "subscription_end_date");

-- Set defaults
ALTER TABLE tenants ALTER COLUMN max_users SET DEFAULT 1;
ALTER TABLE tenants ALTER COLUMN max_ai_tokens SET DEFAULT 0;
ALTER TABLE tenants ALTER COLUMN license_type SET DEFAULT 'LIFETIME'::"license_type";

-- Grandfather existing tenants based on active usage
WITH tenant_stats AS (
    SELECT 
        t.id,
        COUNT(DISTINCT u.id) as user_count,
        MAX(CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END) as has_ai
    FROM tenants t
    LEFT JOIN users u ON u.tenant_id = t.id AND u.is_active = true
    LEFT JOIN ai_rules a ON a.tenant_id = t.id AND a.is_active = true
    GROUP BY t.id
)
UPDATE tenants
SET 
    max_users = GREATEST(1, ts.user_count::integer),
    max_ai_tokens = CASE WHEN ts.has_ai = 1 THEN -1 ELSE 0 END
FROM tenant_stats ts
WHERE tenants.id = ts.id;

-- Check constraints
ALTER TABLE tenants ADD CONSTRAINT tenants_max_users_check CHECK (max_users >= 1 OR max_users = -1);
ALTER TABLE tenants ADD CONSTRAINT tenants_max_ai_tokens_check CHECK (max_ai_tokens >= -1);
ALTER TABLE tenants ADD CONSTRAINT tenants_lifetime_no_end_date_check CHECK (license_type = 'SUBSCRIPTION'::"license_type" OR subscription_end_date IS NULL);
