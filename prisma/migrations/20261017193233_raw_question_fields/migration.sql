-- AlterTable
ALTER TABLE "RawQuestion" ADD COLUMN     "difficultyFelt" "Difficulty",
ADD COLUMN     "fields" JSONB,
ADD COLUMN     "notes" TEXT;

