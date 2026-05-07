import { prisma } from "@/lib/db";
import { z } from "zod";

/**
 * Posts collection Route Handler.
 *
 * GET:
 * - Supports pagination via `page` and `pageSize` query params.
 * - Returns `{ data, meta }` where `data` includes joined Category + Author labels.
 *
 * POST:
 * - Accepts JSON body validated by Zod.
 * - Writes the post and an audit log entry inside a transaction.
 * - Returns 201 with `{ data: { id } }`.
 *
 * Error handling:
 * - 400 for validation failures
 * - 500 for unexpected errors
 */
/**
 * Parses an integer query param and clamps it to a safe range.
 * Used for pagination inputs to prevent NaN and overly large values.
 */
function parseBoundedInt(value: string | null, fallback: number, min: number, max: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

const postSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  published: z.boolean().optional(),
  categoryId: z.number().int().positive(),
  authorId: z.number().int().positive(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = parseBoundedInt(url.searchParams.get("page"), 1, 1, 1_000_000);
    const pageSize = parseBoundedInt(url.searchParams.get("pageSize"), 10, 1, 50);
    const skip = (page - 1) * pageSize;

    const [total, data] = await Promise.all([
      prisma.post.count(),
      prisma.post.findMany({
        select: {
          id: true,
          title: true,
          content: true,
          published: true,
          createdAt: true,
          updatedAt: true,
          category: { select: { id: true, name: true } },
          author: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { updatedAt: "desc" },
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
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid post data" }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          title: parsed.data.title,
          content: parsed.data.content,
          published: parsed.data.published ?? false,
          categoryId: parsed.data.categoryId,
          authorId: parsed.data.authorId,
        },
        select: { id: true, title: true, published: true, categoryId: true, authorId: true },
      });

      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "POST",
          entityId: post.id,
          metadata: {
            title: post.title,
            published: post.published,
            categoryId: post.categoryId,
            authorId: post.authorId,
          },
        },
      });

      return { id: post.id };
    });

    return Response.json({ data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * Consistent 405 helper for unsupported methods.
 * Including `Allow` makes the API self-describing for clients.
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
