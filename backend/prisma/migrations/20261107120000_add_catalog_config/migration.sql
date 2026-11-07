-- CreateTable
CREATE TABLE "catalog_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'none',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "base_url" TEXT,
    "api_key" TEXT,
    "connection" JSONB,
    "search_schema" JSONB,
    "pricing" JSONB,
    "features" JSONB,
    "ai_rules" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_configs_tenant_id_key" ON "catalog_configs"("tenant_id");

-- AddForeignKey
ALTER TABLE "catalog_configs" ADD CONSTRAINT "catalog_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
