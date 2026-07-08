-- CreateEnum
CREATE TYPE "RoutingStrategy" AS ENUM ('MANUAL', 'ROUND_ROBIN');

-- CreateTable
CREATE TABLE "assignment_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "strategy" "RoutingStrategy" NOT NULL DEFAULT 'MANUAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligible_vendors" (
    "rule_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "eligible_vendors_pkey" PRIMARY KEY ("rule_id","user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assignment_rules_tenant_id_key" ON "assignment_rules"("tenant_id");

-- CreateIndex
CREATE INDEX "eligible_vendors_rule_id_idx" ON "eligible_vendors"("rule_id");

-- CreateIndex
CREATE INDEX "eligible_vendors_user_id_idx" ON "eligible_vendors"("user_id");

-- AddForeignKey
ALTER TABLE "assignment_rules" ADD CONSTRAINT "assignment_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligible_vendors" ADD CONSTRAINT "eligible_vendors_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "assignment_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligible_vendors" ADD CONSTRAINT "eligible_vendors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
