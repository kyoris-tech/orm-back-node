-- CreateEnum
CREATE TYPE "WorkModel" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('CLT', 'PJ', 'INTERNSHIP', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "JobOpeningStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "SelectionProcess" ADD COLUMN     "jobOpeningId" TEXT;

-- CreateTable
CREATE TABLE "JobOpening" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "workModel" "WorkModel" NOT NULL,
    "contractType" "ContractType" NOT NULL,
    "salaryRange" TEXT,
    "requirements" TEXT[],
    "differentials" TEXT[],
    "status" "JobOpeningStatus" NOT NULL DEFAULT 'OPEN',
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobOpening_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SelectionProcess" ADD CONSTRAINT "SelectionProcess_jobOpeningId_fkey" FOREIGN KEY ("jobOpeningId") REFERENCES "JobOpening"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobOpening" ADD CONSTRAINT "JobOpening_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobOpening" ADD CONSTRAINT "JobOpening_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
