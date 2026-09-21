/**
 * lib/prisma.ts — Singleton PrismaClient (Prisma 7+)
 *
 * In Prisma 7 the schema's datasource block no longer holds the DB URL.
 * The CLI reads it from prisma.config.ts (migrations, generate, studio…).
 * The runtime client gets the connection via a driver adapter — here we use
 * @prisma/adapter-pg which wraps the standard `pg` (node-postgres) pool.
 *
 * WHY a singleton?
 * Next.js HMR re-executes module code on every file save. Each new PrismaClient
 * opens a fresh connection pool — you'd exhaust Postgres max_connections quickly.
 * Caching on `globalThis` (which survives HMR) fixes this.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  // PrismaPg reads the connection string and manages a pg.Pool internally.
  // It accepts any options that pg.Pool accepts (max, idleTimeoutMillis, etc.)
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"] // log every SQL query in dev
        : ["error"],
  });
}

const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;
