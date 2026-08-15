-- CreateEnum
CREATE TYPE "SelectionProcessStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "SelectionProcess" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SelectionProcessStatus" NOT NULL DEFAULT 'OPEN',
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SelectionProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelectionProcessCandidate" (
    "id" TEXT NOT NULL,
    "selectionProcessId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SelectionProcessCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SelectionProcessCandidate_selectionProcessId_resumeId_key" ON "SelectionProcessCandidate"("selectionProcessId", "resumeId");

-- AddForeignKey
ALTER TABLE "SelectionProcess" ADD CONSTRAINT "SelectionProcess_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionProcess" ADD CONSTRAINT "SelectionProcess_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionProcessCandidate" ADD CONSTRAINT "SelectionProcessCandidate_selectionProcessId_fkey" FOREIGN KEY ("selectionProcessId") REFERENCES "SelectionProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionProcessCandidate" ADD CONSTRAINT "SelectionProcessCandidate_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
