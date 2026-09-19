import { config } from "dotenv";

// Prisma CLI runs outside Next.js, so it will not load `.env.local` on its
// own. Load `.env` then `.env.local` (`.env.local` wins, override stays off).
config({ path: ".env" });
config({ path: ".env.local" });

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Prisma CLI (migrations, seed, introspection) needs the DIRECT connection.
    // The application runtime uses the pooled DATABASE_URL via the Neon adapter.
    url: env("DIRECT_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});