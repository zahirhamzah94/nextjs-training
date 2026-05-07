'use server'

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireAnyRole } from "@/lib/auth";

/**
 * Server Actions for CRUD mutations.
 *
 * These actions are passed directly to `<form action={...}>` in Server Components.
 *
 * High-level flow (all actions):
 * - Parse FormData → validate with Zod → write via Prisma (often inside `$transaction`) → write an audit log row
 * - Revalidate affected routes so list/detail pages update
 * - Redirect to the next page (Post/Redirect/Get pattern)
 *
 * Notes:
 * - Errors thrown here surface as a failed mutation; production apps usually return structured errors for UI.
 * - Audit logging is performed in the same transaction as the mutation so they stay consistent.
 */
function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Reads a string field that may be empty.
 * - Returns `undefined` for missing / non-string / whitespace-only inputs.
 */
function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

/**
 * Reads an integer field from FormData.
 * - Returns `NaN` when parsing fails so callers can use `Number.isFinite(...)` checks.
 */
function getInt(formData: FormData, key: string) {
  const raw = getString(formData, key);
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : NaN;
}

/**
 * Reads a checkbox-like boolean field from FormData.
 * - HTML checkboxes submit "on" when checked; this also accepts "true"/"1" for flexibility.
 */
function getBool(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

/**
 * Zod validation schemas.
 * - Keep them close to the actions so it's clear what shape the forms must submit.
 */
const categorySchema = z.object({
  name: z.string().min(1),
});

const postSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  published: z.boolean(),
  categoryId: z.number().int().positive(),
  authorId: z.number().int().positive(),
});

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(["USER", "TRAINER", "ADMIN"]),
  bio: z.string().optional(),
});

/**
 * Creates a category and writes an audit log entry.
 * Redirects back to `/categories` after successful creation.
 */
export async function createCategory(formData: FormData) {
  await requireAnyRole(["admin", "editor"]);
  const parsed = categorySchema.safeParse({
    name: getString(formData, "name"),
  });
  if (!parsed.success) {
    throw new Error("Invalid category data");
  }

  await prisma.$transaction(async (tx) => {
    const category = await tx.category.create({ data: { name: parsed.data.name }, select: { id: true, name: true } });
    await tx.auditLog.create({
      data: { action: "CREATE", entityType: "CATEGORY", entityId: category.id, metadata: { name: category.name } },
    });
  });
  revalidatePath("/categories");
  redirect("/categories");
}

/**
 * Updates a category name and writes an audit log entry.
 * Redirects to the category detail page after successful update.
 */
export async function updateCategory(formData: FormData) {
  await requireAnyRole(["admin", "editor"]);
  const id = getInt(formData, "id");
  if (!Number.isFinite(id)) {
    throw new Error("Invalid category id");
  }

  const parsed = categorySchema.safeParse({
    name: getString(formData, "name"),
  });
  if (!parsed.success) {
    throw new Error("Invalid category data");
  }

  await prisma.$transaction(async (tx) => {
    const category = await tx.category.update({
      where: { id },
      data: { name: parsed.data.name },
      select: { id: true, name: true },
    });
    await tx.auditLog.create({
      data: { action: "UPDATE", entityType: "CATEGORY", entityId: category.id, metadata: { name: category.name } },
    });
  });
  revalidatePath("/categories");
  revalidatePath(`/categories/${id}`);
  redirect(`/categories/${id}`);
}

/**
 * Deletes a category and writes an audit log entry.
 * - Reads the existing category first to capture metadata (name) for the audit log.
 */
export async function deleteCategory(formData: FormData) {
  await requireAnyRole(["admin", "editor"]);
  const id = getInt(formData, "id");
  if (!Number.isFinite(id)) {
    throw new Error("Invalid category id");
  }

  await prisma.$transaction(async (tx) => {
    const category = await tx.category.findUnique({ where: { id }, select: { id: true, name: true } });
    await tx.category.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        action: "DELETE",
        entityType: "CATEGORY",
        entityId: id,
        metadata: category ? { name: category.name } : undefined,
      },
    });
  });
  revalidatePath("/categories");
  redirect("/categories");
}

/**
 * Creates a post and writes an audit log entry.
 * Redirects to the new post detail page on success.
 */
export async function createPost(formData: FormData) {
  await requireAnyRole(["admin", "editor"]);
  const parsed = postSchema.safeParse({
    title: getString(formData, "title"),
    content: getOptionalString(formData, "content"),
    published: getBool(formData, "published"),
    categoryId: getInt(formData, "categoryId"),
    authorId: getInt(formData, "authorId"),
  });
  if (!parsed.success) {
    throw new Error("Invalid post data");
  }

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        published: parsed.data.published,
        categoryId: parsed.data.categoryId,
        authorId: parsed.data.authorId,
      },
      select: { id: true, title: true, published: true, categoryId: true, authorId: true },
    });

    await tx.auditLog.create({
      data: {
        action: "CREATE",
        entityType: "POST",
        entityId: created.id,
        metadata: {
          title: created.title,
          published: created.published,
          categoryId: created.categoryId,
          authorId: created.authorId,
        },
      },
    });

    return created;
  });

  revalidatePath("/posts");
  redirect(`/posts/${post.id}`);
}

/**
 * Updates a post and writes an audit log entry.
 * Redirects back to the post detail page on success.
 */
export async function updatePost(formData: FormData) {
  await requireAnyRole(["admin", "editor"]);
  const id = getInt(formData, "id");
  if (!Number.isFinite(id)) {
    throw new Error("Invalid post id");
  }

  const parsed = postSchema.safeParse({
    title: getString(formData, "title"),
    content: getOptionalString(formData, "content"),
    published: getBool(formData, "published"),
    categoryId: getInt(formData, "categoryId"),
    authorId: getInt(formData, "authorId"),
  });
  if (!parsed.success) {
    throw new Error("Invalid post data");
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.post.update({
      where: { id },
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        published: parsed.data.published,
        categoryId: parsed.data.categoryId,
        authorId: parsed.data.authorId,
      },
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
  });

  revalidatePath("/posts");
  revalidatePath(`/posts/${id}`);
  redirect(`/posts/${id}`);
}

/**
 * Deletes a post and writes an audit log entry.
 * - Reads the existing post first to capture metadata (title) for the audit log.
 */
export async function deletePost(formData: FormData) {
  await requireAnyRole(["admin", "editor"]);
  const id = getInt(formData, "id");
  if (!Number.isFinite(id)) {
    throw new Error("Invalid post id");
  }

  await prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({ where: { id }, select: { id: true, title: true } });
    await tx.post.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        action: "DELETE",
        entityType: "POST",
        entityId: id,
        metadata: post ? { title: post.title } : undefined,
      },
    });
  });
  revalidatePath("/posts");
  redirect("/posts");
}

/**
 * Creates a user (and optional profile) and writes an audit log entry.
 * Redirects to the edit page after successful creation.
 */
export async function createUser(formData: FormData) {
  await requireAnyRole(["admin"]);
  const parsed = userSchema.safeParse({
    email: getString(formData, "email"),
    name: getOptionalString(formData, "name"),
    role: getString(formData, "role"),
    bio: getOptionalString(formData, "bio"),
  });
  if (!parsed.success) {
    throw new Error("Invalid user data");
  }

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        profile: parsed.data.bio ? { create: { bio: parsed.data.bio } } : undefined,
      },
      select: { id: true, email: true, role: true },
    });

    await tx.auditLog.create({
      data: { action: "CREATE", entityType: "USER", entityId: created.id, metadata: { email: created.email, role: created.role } },
    });

    return created;
  });

  revalidatePath("/users");
  redirect(`/users/${user.id}/edit`);
}

/**
 * Updates a user and optional profile bio.
 *
 * Profile behavior:
 * - If `bio` is provided: upsert profile row (create or update).
 * - If `bio` is omitted/empty: delete any existing profile row.
 */
export async function updateUser(formData: FormData) {
  await requireAnyRole(["admin"]);
  const id = getInt(formData, "id");
  if (!Number.isFinite(id)) {
    throw new Error("Invalid user id");
  }

  const parsed = userSchema.safeParse({
    email: getString(formData, "email"),
    name: getOptionalString(formData, "name"),
    role: getString(formData, "role"),
    bio: getOptionalString(formData, "bio"),
  });
  if (!parsed.success) {
    throw new Error("Invalid user data");
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        profile: parsed.data.bio
          ? { upsert: { create: { bio: parsed.data.bio }, update: { bio: parsed.data.bio } } }
          : undefined,
      },
      select: { id: true, email: true, role: true },
    });

    if (!parsed.data.bio) {
      await tx.profile.deleteMany({ where: { userId: id } });
    }

    await tx.auditLog.create({
      data: { action: "UPDATE", entityType: "USER", entityId: updated.id, metadata: { email: updated.email, role: updated.role } },
    });
  });

  revalidatePath("/users");
  redirect(`/users/${id}/edit`);
}

/**
 * Deletes a user and writes an audit log entry.
 * - Reads the existing user first to capture metadata (email/role) for the audit log.
 */
export async function deleteUser(formData: FormData) {
  await requireAnyRole(["admin"]);
  const id = getInt(formData, "id");
  if (!Number.isFinite(id)) {
    throw new Error("Invalid user id");
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id }, select: { id: true, email: true, role: true } });
    await tx.user.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        action: "DELETE",
        entityType: "USER",
        entityId: id,
        metadata: user ? { email: user.email, role: user.role } : undefined,
      },
    });
  });
  revalidatePath("/users");
  redirect("/users");
}
