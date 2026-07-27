-- CreateTable
CREATE TABLE "canned_responses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "shortcut" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canned_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canned_response_usages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "canned_response_id" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "use_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "canned_response_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "canned_responses_tenant_id_idx" ON "canned_responses"("tenant_id");

-- CreateIndex
CREATE INDEX "canned_response_usages_user_id_idx" ON "canned_response_usages"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "canned_response_usages_user_id_canned_response_id_key" ON "canned_response_usages"("user_id", "canned_response_id");

-- AddForeignKey
ALTER TABLE "canned_responses" ADD CONSTRAINT "canned_responses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canned_response_usages" ADD CONSTRAINT "canned_response_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canned_response_usages" ADD CONSTRAINT "canned_response_usages_canned_response_id_fkey" FOREIGN KEY ("canned_response_id") REFERENCES "canned_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
