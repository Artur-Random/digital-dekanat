-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RuleTrigger" ADD VALUE 'DEBT_NOT_LIQUIDATED';
ALTER TYPE "RuleTrigger" ADD VALUE 'RETAKE_RAISED_STIPEND';
ALTER TYPE "RuleTrigger" ADD VALUE 'RETAKE_SCHEDULE_LOCKED';
ALTER TYPE "RuleTrigger" ADD VALUE 'CONDITIONAL_TRANSFER';
ALTER TYPE "RuleTrigger" ADD VALUE 'RETAKE_FREE';
ALTER TYPE "RuleTrigger" ADD VALUE 'ACADEMIC_LEAVE_NO_STAY';
ALTER TYPE "RuleTrigger" ADD VALUE 'STIPEND_STOPPED';
ALTER TYPE "RuleTrigger" ADD VALUE 'STIPEND_PAID';
ALTER TYPE "RuleTrigger" ADD VALUE 'RAISED_STIPEND_WINDOW';

-- AlterTable
ALTER TABLE "Norm" ADD COLUMN     "usedIn" TEXT;

-- AlterTable
ALTER TABLE "Rule" ADD COLUMN     "stipendOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "_RuleLevels" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RuleLevels_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_RuleLevels_B_index" ON "_RuleLevels"("B");

-- AddForeignKey
ALTER TABLE "_RuleLevels" ADD CONSTRAINT "_RuleLevels_A_fkey" FOREIGN KEY ("A") REFERENCES "EducationLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RuleLevels" ADD CONSTRAINT "_RuleLevels_B_fkey" FOREIGN KEY ("B") REFERENCES "Rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
