import { prisma } from "@/lib/db";

type PageMeta = { page: number; pageSize: number; total: number; totalPages: number };

function clampPage(requestedPage: number, totalPages: number) {
  if (!Number.isFinite(requestedPage) || requestedPage < 1) return 1;
  return Math.min(requestedPage, totalPages);
}

function computeMeta(page: number, pageSize: number, total: number): PageMeta {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { page: clampPage(page, totalPages), pageSize, total, totalPages };
}

export async function getTrainersPage(input: { page: number; pageSize: number }) {
  const where = { role: "TRAINER" as const };
  const total = await prisma.user.count({ where });
  const meta = computeMeta(input.page, input.pageSize, total);
  const skip = (meta.page - 1) * meta.pageSize;

  const data = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    skip,
    take: meta.pageSize,
  });

  return { data, meta };
}

export async function getPostsPage(input: { page: number; pageSize: number }) {
  const total = await prisma.post.count();
  const meta = computeMeta(input.page, input.pageSize, total);
  const skip = (meta.page - 1) * meta.pageSize;

  const data = await prisma.post.findMany({
    select: {
      id: true,
      title: true,
      published: true,
      updatedAt: true,
      category: { select: { id: true, name: true } },
      author: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
    skip,
    take: meta.pageSize,
  });

  return { data, meta };
}

export async function getPostById(postId: number) {
  return prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      content: true,
      published: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { id: true, name: true } },
      author: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getPostEditData(postId: number) {
  const [post, categories, users] = await Promise.all([
    prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, title: true, content: true, published: true, categoryId: true, authorId: true },
    }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { updatedAt: "desc" } }),
  ]);

  return { post, categories, users };
}

export async function getPostNewData() {
  const [categories, users] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { updatedAt: "desc" } }),
  ]);

  return { categories, users };
}

export async function getCategoriesPage(input: { page: number; pageSize: number }) {
  const total = await prisma.category.count();
  const meta = computeMeta(input.page, input.pageSize, total);
  const skip = (meta.page - 1) * meta.pageSize;

  const data = await prisma.category.findMany({
    select: { id: true, name: true, _count: { select: { posts: true } } },
    orderBy: { name: "asc" },
    skip,
    take: meta.pageSize,
  });

  return { data, meta };
}

export async function getCategoryById(categoryId: number) {
  return prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true },
  });
}

export async function getCategoryPostsPage(input: { categoryId: number; page: number; pageSize: number }) {
  const total = await prisma.post.count({ where: { categoryId: input.categoryId } });
  const meta = computeMeta(input.page, input.pageSize, total);
  const skip = (meta.page - 1) * meta.pageSize;

  const data = await prisma.post.findMany({
    where: { categoryId: input.categoryId },
    select: {
      id: true,
      title: true,
      published: true,
      updatedAt: true,
      author: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
    skip,
    take: meta.pageSize,
  });

  return { data, meta };
}

export async function getUsersPage(input: { page: number; pageSize: number }) {
  const total = await prisma.user.count();
  const meta = computeMeta(input.page, input.pageSize, total);
  const skip = (meta.page - 1) * meta.pageSize;

  const data = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    skip,
    take: meta.pageSize,
  });

  return { data, meta };
}

export async function getUserById(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, profile: { select: { bio: true } } },
  });
}

