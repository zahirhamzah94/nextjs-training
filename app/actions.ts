'use server'

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function getInt(formData: FormData, key: string) {
  const raw = getString(formData, key);
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function getBool(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

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

export async function createCategory(formData: FormData) {
  const parsed = categorySchema.safeParse({
    name: getString(formData, "name"),
  });
  if (!parsed.success) {
    throw new Error("Invalid category data");
  }

  await prisma.category.create({ data: { name: parsed.data.name } });
  revalidatePath("/categories");
  redirect("/categories");
}

export async function updateCategory(formData: FormData) {
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

  await prisma.category.update({ where: { id }, data: { name: parsed.data.name } });
  revalidatePath("/categories");
  revalidatePath(`/categories/${id}`);
  redirect(`/categories/${id}`);
}

export async function deleteCategory(formData: FormData) {
  const id = getInt(formData, "id");
  if (!Number.isFinite(id)) {
    throw new Error("Invalid category id");
  }

  await prisma.category.delete({ where: { id } });
  revalidatePath("/categories");
  redirect("/categories");
}

export async function createPost(formData: FormData) {
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

  const post = await prisma.post.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      published: parsed.data.published,
      categoryId: parsed.data.categoryId,
      authorId: parsed.data.authorId,
    },
    select: { id: true },
  });

  revalidatePath("/posts");
  redirect(`/posts/${post.id}`);
}

export async function updatePost(formData: FormData) {
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

  await prisma.post.update({
    where: { id },
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      published: parsed.data.published,
      categoryId: parsed.data.categoryId,
      authorId: parsed.data.authorId,
    },
  });

  revalidatePath("/posts");
  revalidatePath(`/posts/${id}`);
  redirect(`/posts/${id}`);
}

export async function deletePost(formData: FormData) {
  const id = getInt(formData, "id");
  if (!Number.isFinite(id)) {
    throw new Error("Invalid post id");
  }

  await prisma.post.delete({ where: { id } });
  revalidatePath("/posts");
  redirect("/posts");
}

export async function createUser(formData: FormData) {
  const parsed = userSchema.safeParse({
    email: getString(formData, "email"),
    name: getOptionalString(formData, "name"),
    role: getString(formData, "role"),
    bio: getOptionalString(formData, "bio"),
  });
  if (!parsed.success) {
    throw new Error("Invalid user data");
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      profile: parsed.data.bio ? { create: { bio: parsed.data.bio } } : undefined,
    },
    select: { id: true },
  });

  revalidatePath("/users");
  redirect(`/users/${user.id}/edit`);
}

export async function updateUser(formData: FormData) {
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

  await prisma.user.update({
    where: { id },
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      profile: parsed.data.bio
        ? { upsert: { create: { bio: parsed.data.bio }, update: { bio: parsed.data.bio } } }
        : undefined,
    },
  });

  if (!parsed.data.bio) {
    await prisma.profile.deleteMany({ where: { userId: id } });
  }

  revalidatePath("/users");
  redirect(`/users/${id}/edit`);
}

export async function deleteUser(formData: FormData) {
  const id = getInt(formData, "id");
  if (!Number.isFinite(id)) {
    throw new Error("Invalid user id");
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/users");
  redirect("/users");
}
