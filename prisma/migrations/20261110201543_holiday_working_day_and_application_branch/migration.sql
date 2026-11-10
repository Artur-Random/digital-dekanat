-- AlterEnum
ALTER TYPE "HolidayKind" ADD VALUE 'TRANSFERRED_WORKING_DAY';

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "branch" TEXT NOT NULL DEFAULT 'MAIN';

-- AlterTable
ALTER TABLE "Holiday" ADD COLUMN     "isWorkingDay" BOOLEAN NOT NULL DEFAULT false;
