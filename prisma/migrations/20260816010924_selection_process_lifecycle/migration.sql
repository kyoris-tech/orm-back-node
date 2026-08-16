-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SelectionProcessStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "SelectionProcessStatus" ADD VALUE 'CONCLUDED';

-- AlterTable
ALTER TABLE "SelectionProcess" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "concludedAt" TIMESTAMP(3),
ADD COLUMN     "selectedResumeId" TEXT;

-- AddForeignKey
ALTER TABLE "SelectionProcess" ADD CONSTRAINT "SelectionProcess_selectedResumeId_fkey" FOREIGN KEY ("selectedResumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
