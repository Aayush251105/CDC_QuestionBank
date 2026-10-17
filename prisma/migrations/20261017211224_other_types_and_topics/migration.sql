-- "Other" wherever something cannot be classified (2026-10-18).
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'OTHER';
ALTER TYPE "RoundType" ADD VALUE IF NOT EXISTS 'OTHER';

-- New topics. groupOrder follows TAG_GROUPS in prisma/seed.ts.
INSERT INTO "Tag" ("id", "name", "slug", "group", "groupOrder") VALUES
  ('tag_system_design', 'System design', 'system-design', 'Computer science fundamentals', 2),
  ('tag_other', 'Other', 'other', 'Other', 3)
ON CONFLICT DO NOTHING;
