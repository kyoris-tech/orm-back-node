-- CreateEnum
CREATE TYPE "CompanyPlan" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "plan" "CompanyPlan" NOT NULL DEFAULT 'BASIC';
