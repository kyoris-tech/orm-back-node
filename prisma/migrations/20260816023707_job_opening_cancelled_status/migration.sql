-- AlterEnum
ALTER TYPE "JobOpeningStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "JobOpening" ADD COLUMN     "cancelledAt" TIMESTAMP(3);
