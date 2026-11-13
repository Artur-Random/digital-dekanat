/*
  Warnings:

  - You are about to drop the column `levelId` on the `Rule` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "RuleTrigger" ADD VALUE 'STIPEND_AFTER_LIQUIDATION';

-- DropForeignKey
ALTER TABLE "Rule" DROP CONSTRAINT "Rule_levelId_fkey";

-- DropIndex
DROP INDEX "Rule_levelId_trigger_idx";

-- AlterTable
ALTER TABLE "Rule" DROP COLUMN "levelId",
ADD COLUMN     "prototypeAssumption" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Rule_trigger_idx" ON "Rule"("trigger");
