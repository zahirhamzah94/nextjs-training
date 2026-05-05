import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const postUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  published: z.boolean().optional(),
  categoryId: z.number().int().positive().optional(),
  authorId: z.number().int().positive().optional(),
});

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

    const data = await prisma.post.update({
      where: { id: postId },
      data: parsed.data,
      select: { id: true },
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

    await prisma.post.delete({ where: { id: postId } });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
