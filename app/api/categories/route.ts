import { prisma } from "@/lib/db";
import { z } from "zod";

/**
 * Categories collection Route Handler.
 *
 * GET:
 * - Pagination via `page` and `pageSize`.
 * - Returns `{ data, meta }` where each category includes a posts count (`_count.posts`).
 *
 * POST:
 * - Accepts `{ name }` JSON (validated with Zod).
 * - Creates category + audit log entry in a single transaction.
 */
/**
 * Parses an integer query param and clamps it to a safe range.
 */
function parseBoundedInt(value: string | null, fallback: number, min: number, max: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

const categorySchema = z.object({ name: z.string().min(1) });

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = parseBoundedInt(url.searchParams.get("page"), 1, 1, 1_000_000);
    const pageSize = parseBoundedInt(url.searchParams.get("pageSize"), 10, 1, 50);
    const skip = (page - 1) * pageSize;

    const [total, data] = await Promise.all([
      prisma.category.count(),
      prisma.category.findMany({
        select: { id: true, name: true, _count: { select: { posts: true } } },
        orderBy: { name: "asc" },
        skip,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return Response.json({
      data,
      meta: { page: Math.min(page, totalPages), pageSize, total, totalPages },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid category data" }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const category = await tx.category.create({
        data: { name: parsed.data.name },
        select: { id: true, name: true },
      });
      await tx.auditLog.create({
        data: { action: "CREATE", entityType: "CATEGORY", entityId: category.id, metadata: { name: category.name } },
      });
      return category;
    });

    return Response.json({ data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * Consistent 405 helper for unsupported methods.
 */
function methodNotAllowed(method: string) {
  return Response.json(
    { error: `Method ${method} not allowed` },
    { status: 405, headers: { Allow: "GET, POST" } },
  );
}

export async function PUT() {
  return methodNotAllowed("PUT");
}

export async function PATCH() {
  return methodNotAllowed("PATCH");
}

export async function DELETE() {
  return methodNotAllowed("DELETE");
}
