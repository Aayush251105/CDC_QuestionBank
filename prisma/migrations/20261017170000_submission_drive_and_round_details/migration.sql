-- Submit flow (S1/S2): a draft belongs to a drive from S1; the round is
-- picked in S2, so roundId becomes optional. Students can add an unlisted
-- round, which stays unverified like a student-created drive.

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_roundId_fkey";

-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: driveId added empty, filled from each submission's round,
-- then made required.
ALTER TABLE "Submission" ADD COLUMN     "driveId" TEXT,
ADD COLUMN     "durationMin" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "platform" TEXT,
ADD COLUMN     "sections" JSONB,
ADD COLUMN     "testDate" TIMESTAMP(3),
ALTER COLUMN "roundId" DROP NOT NULL;

UPDATE "Submission" AS s
SET "driveId" = r."driveId"
FROM "Round" AS r
WHERE s."roundId" = r."id";

ALTER TABLE "Submission" ALTER COLUMN "driveId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Submission_userId_driveId_idx" ON "Submission"("userId", "driveId");

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_driveId_fkey" FOREIGN KEY ("driveId") REFERENCES "Drive"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;
