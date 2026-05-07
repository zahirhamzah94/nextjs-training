import { prisma } from "@/lib/db";
import { z } from "zod";

/**
 * Single Category Route Handler.
 *
 * Methods:
 * - GET    → returns category (and posts count) by id
 * - PUT    → update (delegates to `updateCategory()`)
 * - PATCH  → update (delegates to `updateCategory()`)
 * - DELETE → delete and write an audit log entry
 *
 * Flow for updates:
 * - Parse `id` → validate JSON body with Zod → update row → insert audit log row (same transaction).
 */
const categoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
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
    const categoryId = parseId(id);
    if (!Number.isFinite(categoryId)) {
      return Response.json({ error: "Invalid category id" }, { status: 400 });
    }

    const data = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, _count: { select: { posts: true } } },
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
  return updateCategory(request, params);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return updateCategory(request, params);
}

/**
 * Shared implementation for PUT/PATCH so both update paths stay consistent.
 */
async function updateCategory(request: Request, params: Promise<{ id: string }>) {
  try {
    const { id } = await params;
    const categoryId = parseId(id);
    if (!Number.isFinite(categoryId)) {
      return Response.json({ error: "Invalid category id" }, { status: 400 });
    }

    const body: unknown = await request.json();
    const parsed = categoryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid category data" }, { status: 400 });
    }

    const data = await prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({
        where: { id: categoryId },
        data: parsed.data,
        select: { id: true, name: true },
      });
      await tx.auditLog.create({
        data: { action: "UPDATE", entityType: "CATEGORY", entityId: updated.id, metadata: { name: updated.name } },
      });
      return updated;
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
    const categoryId = parseId(id);
    if (!Number.isFinite(categoryId)) {
      return Response.json({ error: "Invalid category id" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const category = await tx.category.findUnique({ where: { id: categoryId }, select: { id: true, name: true } });
      await tx.category.delete({ where: { id: categoryId } });
      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entityType: "CATEGORY",
          entityId: categoryId,
          metadata: category ? { name: category.name } : undefined,
        },
      });
    });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
