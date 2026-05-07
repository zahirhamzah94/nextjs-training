import { prisma } from "@/lib/db";

/**
 * Agencies "Repository" layer (data access).
 *
 * This module intentionally maps "Agencies" to the `Category` table as a teaching demo.
 * The goal is to show a clean split:
 * - Controller: HTTP concerns (query params, Response shape)
 * - Service: business rules and caching decisions
 * - Repository: the raw Prisma query
 */
export async function findAgencies() {
  return prisma.category.findMany({
    select: { id: true, name: true, _count: { select: { posts: true } } },
    orderBy: { name: "asc" },
  });
}
