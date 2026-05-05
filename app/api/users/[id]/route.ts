import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  role: z.enum(["USER", "TRAINER", "ADMIN"]).optional(),
  bio: z.string().optional(),
});

function parseId(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = parseId(id);
    if (!Number.isFinite(userId)) {
      return Response.json({ error: "Invalid user id" }, { status: 400 });
    }

    const data = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        profile: { select: { bio: true } },
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
  return updateUser(request, params);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return updateUser(request, params);
}

async function updateUser(request: Request, params: Promise<{ id: string }>) {
  try {
    const { id } = await params;
    const userId = parseId(id);
    if (!Number.isFinite(userId)) {
      return Response.json({ error: "Invalid user id" }, { status: 400 });
    }

    const body: unknown = await request.json();
    const parsed = userUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid user data" }, { status: 400 });
    }

    const { bio, ...userData } = parsed.data;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...userData,
        profile: bio ? { upsert: { create: { bio }, update: { bio } } } : undefined,
      },
      select: { id: true },
    });

    if (!bio) {
      await prisma.profile.deleteMany({ where: { userId } });
    }

    return Response.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = parseId(id);
    if (!Number.isFinite(userId)) {
      return Response.json({ error: "Invalid user id" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: userId } });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
