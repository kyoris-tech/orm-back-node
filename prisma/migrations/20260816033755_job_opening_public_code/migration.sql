-- AlterTable
ALTER TABLE "JobOpening" ADD COLUMN     "publicCode" TEXT;

-- Backfill existing rows with a random, URL-safe code
UPDATE "JobOpening" SET "publicCode" = substr(md5(random()::text || id), 1, 10) WHERE "publicCode" IS NULL;

-- AlterTable
ALTER TABLE "JobOpening" ALTER COLUMN "publicCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "JobOpening_publicCode_key" ON "JobOpening"("publicCode");
