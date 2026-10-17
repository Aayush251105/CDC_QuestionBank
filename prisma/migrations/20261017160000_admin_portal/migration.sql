-- Admin portal (designs in CDC-Portal-Designs/admin): drive drafts and
-- submission windows, Require PIN, drive requests, shortlist uploads with
-- matching, per-question review decisions, unpublishing, company merges,
-- blocking students, a wider audit log and super admin settings.
--
-- ShortlistEntry gains NOT NULL columns without defaults. Nothing wrote to
-- that table before the admin side, so it is empty on every database.

-- CreateEnum
CREATE TYPE "ShortlistMatch" AS ENUM ('ROLL_NO', 'EMAIL', 'NAME', 'NONE');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'MERGED', 'REJECTED');

-- AlterEnum
ALTER TYPE "DriveStatus" ADD VALUE 'DRAFT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "lastSignInAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "mergedIntoId" TEXT;

-- AlterTable
ALTER TABLE "Drive" ADD COLUMN     "closesAt" TIMESTAMP(3),
ADD COLUMN     "opensAt" TIMESTAMP(3),
ADD COLUMN     "requestResolvedAt" TIMESTAMP(3),
ADD COLUMN     "requirePin" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ShortlistEntry" ADD COLUMN     "match" "ShortlistMatch" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "matchedUserId" TEXT,
ADD COLUMN     "rowNo" INTEGER NOT NULL,
ADD COLUMN     "uploadId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "pinUsed" CHAR(6);

-- AlterTable
ALTER TABLE "RawQuestion" ADD COLUMN     "decision" "ReviewDecision";

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "unpublishedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ReviewAction" ADD COLUMN     "detail" TEXT,
ADD COLUMN     "driveId" TEXT,
ADD COLUMN     "summary" TEXT;

-- CreateTable
CREATE TABLE "ShortlistUpload" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortlistUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "ShortlistUpload_roundId_createdAt_idx" ON "ShortlistUpload"("roundId", "createdAt");

-- CreateIndex
CREATE INDEX "ShortlistEntry_uploadId_idx" ON "ShortlistEntry"("uploadId");

-- CreateIndex
CREATE INDEX "ReviewAction_driveId_createdAt_idx" ON "ReviewAction"("driveId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewAction_createdAt_idx" ON "ReviewAction"("createdAt");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistUpload" ADD CONSTRAINT "ShortlistUpload_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistUpload" ADD CONSTRAINT "ShortlistUpload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistEntry" ADD CONSTRAINT "ShortlistEntry_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "ShortlistUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistEntry" ADD CONSTRAINT "ShortlistEntry_matchedUserId_fkey" FOREIGN KEY ("matchedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

