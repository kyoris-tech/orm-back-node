-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxUsers" INTEGER,
    "maxResumesPerMonth" INTEGER,
    "features" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- Seed the three existing plans (same limits already used in code)
INSERT INTO "Plan" ("id", "name", "maxUsers", "maxResumesPerMonth", "features", "updatedAt") VALUES
    ('37f0733d-1c21-4053-9fb1-b1b3aa3eacc9', 'Básico', 2, 50, ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
    ('6d70af91-9ae7-4cd1-a72c-7a4c4831aa68', 'Pro', 10, 500, ARRAY['jobOpenings', 'selectionProcesses', 'reports'], CURRENT_TIMESTAMP),
    ('e68b9a6a-cca9-4c16-8150-dcdeaa7207b4', 'Enterprise', NULL, NULL, ARRAY['jobOpenings', 'selectionProcesses', 'reports'], CURRENT_TIMESTAMP);

-- AlterTable: add new Company columns (planId nullable for now, backfilled below)
ALTER TABLE "Company" ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "segment" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "planId" TEXT;

-- Backfill planId from the old enum column
UPDATE "Company" SET "planId" = CASE "plan"
    WHEN 'BASIC' THEN '37f0733d-1c21-4053-9fb1-b1b3aa3eacc9'
    WHEN 'PRO' THEN '6d70af91-9ae7-4cd1-a72c-7a4c4831aa68'
    WHEN 'ENTERPRISE' THEN 'e68b9a6a-cca9-4c16-8150-dcdeaa7207b4'
END;

-- Make planId required now that it's backfilled
ALTER TABLE "Company" ALTER COLUMN "planId" SET NOT NULL;

-- Drop the old enum column and type
ALTER TABLE "Company" DROP COLUMN "plan";
DROP TYPE "CompanyPlan";

-- CreateIndex
CREATE UNIQUE INDEX "Company_cnpj_key" ON "Company"("cnpj");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
