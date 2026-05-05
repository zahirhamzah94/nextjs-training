import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const categoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
});

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

    const data = await prisma.category.update({
      where: { id: categoryId },
      data: parsed.data,
      select: { id: true, name: true },
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

    await prisma.category.delete({ where: { id: categoryId } });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
