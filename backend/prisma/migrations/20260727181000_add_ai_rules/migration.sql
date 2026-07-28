-- CreateTable
CREATE TABLE "ai_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_rules_tenant_id_idx" ON "ai_rules"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_rules_tenant_id_term_key" ON "ai_rules"("tenant_id", "term");

-- AddForeignKey
ALTER TABLE "ai_rules" ADD CONSTRAINT "ai_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
