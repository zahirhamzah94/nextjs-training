import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

/**
 * Prisma client singleton for the whole app.
 *
 * Responsibilities:
 * - Builds a Prisma client configured with the MariaDB adapter (DATABASE_URL parsing).
 * - Adds a query-timing hook via `$extends` for observability during development.
 * - Ensures a single client instance is reused in dev (hot reload) to avoid exhausting DB connections.
 *
 * Flow:
 * - `createPrismaClient()` reads DATABASE_URL → builds adapter → constructs PrismaClient → adds query timing.
 * - `prisma` exports a cached singleton (`globalThis.prisma` in non-production) or a fresh client in production.
 *
 * Notes:
 * - The `as PrismaClient` cast keeps TypeScript aware of model delegates (e.g., `auditLog`) including inside
 *   `$transaction` callbacks, where the client type can otherwise lose delegate typings.
 */
function createPrismaClient(): PrismaClient {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is not set");
    }

    const url = new URL(databaseUrl);
    const adapter = new PrismaMariaDb({
        host: url.hostname,
        port: url.port ? Number(url.port) : 3306,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname ? decodeURIComponent(url.pathname.replace(/^\//, "")) : undefined,
    });

    const client = new PrismaClient({
        adapter,
        log: ["query", "error", "warn"],
    });

    const extended = client.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    const start = Date.now();
                    const result = await query(args);
                    const duration = Date.now() - start;
                    console.log(`[PRISMA] ${model}.${operation} took ${duration}ms`);
                    return result;
                },
            },
        },
    });

    return extended as PrismaClient;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
