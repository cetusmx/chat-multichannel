-- AlterTable
ALTER TABLE "superadmins"
ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "password_reset_token_hash" TEXT,
ADD COLUMN IF NOT EXISTS "password_reset_expires_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "password_reset_token_hash" TEXT,
ADD COLUMN IF NOT EXISTS "password_reset_expires_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform_email_configs" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 465,
    "secure" BOOLEAN NOT NULL DEFAULT true,
    "user" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "from_name" TEXT,
    "from_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_email_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "superadmins_password_reset_token_hash_idx" ON "superadmins"("password_reset_token_hash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_password_reset_token_hash_idx" ON "users"("password_reset_token_hash");
