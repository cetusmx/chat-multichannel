/*
  Warnings:

  - You are about to drop the `Superadmin` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "ConversationStatus" ADD VALUE 'CLOSED_WON';

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "is_outbound" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "Superadmin";
