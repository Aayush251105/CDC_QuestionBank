import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// The CLI (migrate, studio) uses the direct Neon URL; the app uses the
// pooled DATABASE_URL through the pg adapter in src/server/db.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
