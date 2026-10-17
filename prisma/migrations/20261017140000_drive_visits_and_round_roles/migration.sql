-- A drive is one company visit. Usually one per company and year; a second
-- visit in the same year gets sequence 2 ("2025 · B"). Rounds can be limited
-- to some of the drive's roles. (CLAUDE.md 2a.8)

-- DropIndex
DROP INDEX "Drive_companyId_year_idx";

-- AlterTable
ALTER TABLE "Drive" ADD COLUMN     "sequence" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "name" DROP NOT NULL;

-- Number existing drives 1, 2, ... per company and year, oldest first,
-- so the unique index below can be created.
UPDATE "Drive" AS d
SET "sequence" = s.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "companyId", "year" ORDER BY "createdAt", "id") AS rn
  FROM "Drive"
) AS s
WHERE d."id" = s."id";

-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "roles" TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "Drive_companyId_year_sequence_key" ON "Drive"("companyId", "year", "sequence");
