-- Full-text search for /search (CLAUDE.md section 3). Postgres keeps the
-- vector up to date itself: title counts more (A) than the body (B).

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("bodyMarkdown", '')), 'B')
  ) STORED;

-- CreateIndex
CREATE INDEX "Question_searchVector_idx" ON "Question" USING GIN ("searchVector");
