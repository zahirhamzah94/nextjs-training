import { prisma } from "@/lib/db";
import { z } from "zod";

/**
 * Single User Route Handler.
 *
 * Methods:
 * - GET    → fetch user + profile bio
 * - PUT    → update (delegates to `updateUser()`)
 * - PATCH  → update (delegates to `updateUser()`)
 * - DELETE → delete and write an audit log entry
 *
 * Profile update flow:
 * - If `bio` is present: upsert profile row.
 * - If `bio` is missing/empty: delete existing profile rows for the user.
 */
const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  role: z.enum(["USER", "TRAINER", "ADMIN"]).optional(),
  bio: z.string().optional(),
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

/**
 * Shared implementation for PUT/PATCH so both update paths stay consistent.
 */
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

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          ...userData,
          profile: bio ? { upsert: { create: { bio }, update: { bio } } } : undefined,
        },
        select: { id: true, email: true, role: true },
      });

      if (!bio) {
        await tx.profile.deleteMany({ where: { userId } });
      }

      await tx.auditLog.create({
        data: { action: "UPDATE", entityType: "USER", entityId: user.id, metadata: { email: user.email, role: user.role } },
      });

      return { id: user.id };
    });

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

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } });
      await tx.user.delete({ where: { id: userId } });
      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entityType: "USER",
          entityId: userId,
          metadata: user ? { email: user.email, role: user.role } : undefined,
        },
      });
    });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
