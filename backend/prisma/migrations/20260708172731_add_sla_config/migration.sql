-- CreateTable
CREATE TABLE "sla_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "first_response_mins" INTEGER NOT NULL DEFAULT 15,
    "resolution_mins" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sla_configs_tenant_id_key" ON "sla_configs"("tenant_id");

-- AddForeignKey
ALTER TABLE "sla_configs" ADD CONSTRAINT "sla_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
