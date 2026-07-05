-- AlterTable
ALTER TABLE "users" ADD COLUMN     "coordinator_id" TEXT;

-- CreateIndex
CREATE INDEX "users_coordinator_id_idx" ON "users"("coordinator_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_coordinator_id_fkey" FOREIGN KEY ("coordinator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
