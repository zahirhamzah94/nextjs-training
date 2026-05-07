import { prisma } from "@/lib/db";

/**
 * Data access layer for UI pages and some Route Handlers.
 *
 * Goal:
 * - Keep Prisma queries out of App Router page files so pages stay focused on rendering.
 * - Provide small, testable functions that return exactly the shape the UI needs (via `select`).
 *
 * Typical flow:
 * - Page reads `searchParams` → computes `page`/`pageSize` → calls `get*Page()` here.
 * - This layer does `count()` + `skip/take` and returns `{ data, meta }`.
 * - The page renders tables and pagination controls using `meta`.
 */
type PageMeta = { page: number; pageSize: number; total: number; totalPages: number };

/**
 * Normalizes a requested page number into a valid range.
 * - Non-numbers and pages < 1 become 1.
 * - Pages above the last page clamp to `totalPages`.
 */
function clampPage(requestedPage: number, totalPages: number) {
  if (!Number.isFinite(requestedPage) || requestedPage < 1) return 1;
  return Math.min(requestedPage, totalPages);
}

/**
 * Computes pagination metadata that callers can use to render UI controls.
 *
 * Important detail:
 * - `totalPages` is never 0 (it bottoms out at 1) so UIs can consistently render "Page 1 of 1".
 * - Returned `meta.page` is clamped so callers don't need to defend against invalid URLs.
 */
function computeMeta(page: number, pageSize: number, total: number): PageMeta {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { page: clampPage(page, totalPages), pageSize, total, totalPages };
}

/**
 * Trainers dashboard data (reads Users with role TRAINER).
 *
 * Flow:
 * - `count()` for total trainers → compute meta → query `findMany()` with `skip/take`.
 * - Uses a `select` to avoid over-fetching (table only needs a subset of columns).
 */
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

/**
 * Posts list page data with joined Category + Author labels for the table.
 */
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

/**
 * Post detail data by id.
 * - Returns `null` when the record doesn't exist (caller decides whether to show 404 UI).
 */
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

/**
 * Post edit page data.
 *
 * Flow:
 * - Fetch post + category options + user options in parallel.
 * - The edit page feeds these into <PostForm/> as `defaultValues` and select option lists.
 */
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

/**
 * Post new page data (no post record, only select options).
 */
export async function getPostNewData() {
  const [categories, users] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { updatedAt: "desc" } }),
  ]);

  return { categories, users };
}

/**
 * Categories list page data, including a posts count per category.
 */
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

/**
 * Category detail header data by id.
 */
export async function getCategoryById(categoryId: number) {
  return prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true },
  });
}

/**
 * Category detail "posts in this category" table data.
 *
 * Flow:
 * - Uses `where: { categoryId }` for both `count()` and `findMany()`.
 * - Returns joined Author labels for the table.
 */
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

/**
 * Users list page data.
 */
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

/**
 * User edit page data by id (includes optional profile bio).
 */
export async function getUserById(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, profile: { select: { bio: true } } },
  });
}

/**
 * Audit log table data with optional filters.
 *
 * Flow:
 * - Build a Prisma `where` object from provided filters.
 * - `count()` for totals → compute meta → `findMany()` with `skip/take` and stable ordering.
 */
export async function getAuditLogsPage(input: {
  page: number;
  pageSize: number;
  entityType?: "USER" | "POST" | "CATEGORY";
  action?: "CREATE" | "UPDATE" | "DELETE";
  entityId?: number;
}) {
  const where: {
    entityType?: "USER" | "POST" | "CATEGORY";
    action?: "CREATE" | "UPDATE" | "DELETE";
    entityId?: number;
  } = {};

  if (input.entityType) where.entityType = input.entityType;
  if (input.action) where.action = input.action;
  if (typeof input.entityId === "number" && Number.isFinite(input.entityId)) where.entityId = input.entityId;

  const total = await prisma.auditLog.count({ where });
  const meta = computeMeta(input.page, input.pageSize, total);
  const skip = (meta.page - 1) * meta.pageSize;

  const data = await prisma.auditLog.findMany({
    where,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      actorUserId: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: meta.pageSize,
  });

  return { data, meta };
}

