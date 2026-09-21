/**
 * prisma.config.ts — Prisma CLI configuration (Prisma 7+)
 *
 * This file is used ONLY by the Prisma CLI (prisma migrate, prisma generate,
 * prisma db push, prisma studio, etc.). It is NOT imported by your Next.js app.
 *
 * The runtime PrismaClient (lib/prisma.ts) gets its connection separately
 * via the @prisma/adapter-pg driver adapter.
 */

import "dotenv/config"; // loads .env so process.env.DATABASE_URL is available
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // Path to our schema file (default, but explicit is better)
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    // tsx is the modern, fast alternative to ts-node — no tsconfig hacks needed
    seed: "tsx prisma/seed.ts",
  },

  datasource: {
    // env() is Prisma's typed wrapper around process.env — throws at config-load
    // time if the variable is missing, rather than failing silently at query time
    url: env("DATABASE_URL"),
  },
});
