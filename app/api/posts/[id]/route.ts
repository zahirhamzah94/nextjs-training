import { prisma } from "@/lib/db";
import { z } from "zod";

/**
 * Single Post Route Handler.
 *
 * Params:
 * - `id` is taken from the dynamic route segment `/api/posts/:id` and parsed to an integer.
 *
 * Methods:
 * - GET    → returns one post (404 if not found)
 * - PUT    → full update (delegates to `updatePost()`)
 * - PATCH  → partial update (delegates to `updatePost()`)
 * - DELETE → deletes the post and writes an audit log row
 *
 * Flow for updates:
 * - Validate JSON body with Zod → update row in Prisma → insert audit log entry (same transaction).
 */
const postUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  published: z.boolean().optional(),
  categoryId: z.number().int().positive().optional(),
  authorId: z.number().int().positive().optional(),
});

/**
 * Parses the `id` route param into a number.
 * Returns `NaN` when invalid so callers can use `Number.isFinite(...)`.
 */
function parseId(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const postId = parseId(id);
    if (!Number.isFinite(postId)) {
      return Response.json({ error: "Invalid post id" }, { status: 400 });
    }

    const data = await prisma.post.findUnique({
      where: { id: postId },
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
    });

    if (!data) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return Response.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return updatePost(request, params);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return updatePost(request, params);
}

/**
 * Shared implementation for PUT/PATCH so both update paths stay consistent.
 */
async function updatePost(request: Request, params: Promise<{ id: string }>) {
  try {
    const { id } = await params;
    const postId = parseId(id);
    if (!Number.isFinite(postId)) {
      return Response.json({ error: "Invalid post id" }, { status: 400 });
    }

    const body: unknown = await request.json();
    const parsed = postUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid post data" }, { status: 400 });
    }

    const data = await prisma.$transaction(async (tx) => {
      const updated = await tx.post.update({
        where: { id: postId },
        data: parsed.data,
        select: { id: true, title: true, published: true, categoryId: true, authorId: true },
      });

      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "POST",
          entityId: updated.id,
          metadata: {
            title: updated.title,
            published: updated.published,
            categoryId: updated.categoryId,
            authorId: updated.authorId,
          },
        },
      });

      return { id: updated.id };
    });

    return Response.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const postId = parseId(id);
    if (!Number.isFinite(postId)) {
      return Response.json({ error: "Invalid post id" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({ where: { id: postId }, select: { id: true, title: true } });
      await tx.post.delete({ where: { id: postId } });
      await tx.auditLog.create({
        data: { action: "DELETE", entityType: "POST", entityId: postId, metadata: post ? { title: post.title } : undefined },
      });
    });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
