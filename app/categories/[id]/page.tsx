import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { deleteCategory } from "@/app/actions";
import { getCategoryById, getCategoryPostsPage } from "@/lib/data";

/**
 * Category detail page.
 *
 * Data flow:
 * - Parse `id` from route params.
 * - Load category header via `getCategoryById()`.
 * - Load paginated posts in this category via `getCategoryPostsPage()` using `searchParams`.
 *
 * Mutations:
 * - Delete uses the `deleteCategory` Server Action and then redirects back to `/categories`.
 *
 * Cache Components / Suspense note:
 * - `connection()` is request-time; async work is wrapped in Suspense.
 */
type SearchParams = { [key: string]: string | string[] | undefined };

/**
 * Formats a Date for table display (YYYY-MM-DD).
 */
function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

/**
 * Normalizes a query param that could be `string | string[] | undefined` into a single string.
 */
function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Parses an integer query param and clamps it to a safe range.
 */
function parseBoundedInt(value: string | undefined, fallback: number, min: number, max: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * Helper for building pagination links that keep page/pageSize in the URL.
 */
function buildHref(pathname: string, page: number, pageSize: number) {
  return `${pathname}?page=${page}&pageSize=${pageSize}`;
}

/**
 * Wrapper component providing a Suspense boundary for the async server component.
 */
export default function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<div className="text-black/70 dark:text-white/70">Loading…</div>}>
      <CategoryPageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

/**
 * Async server component that performs DB reads and renders the detail + posts table.
 */
async function CategoryPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  await connection();

  const { id } = await params;
  const categoryId = Number(id);

  if (!Number.isFinite(categoryId)) {
    return (
      <div className="space-y-4">
        <Link href="/categories" className="text-blue-600 hover:underline">
          ← Back to categories
        </Link>
        <h1 className="text-2xl font-bold">Invalid category id</h1>
      </div>
    );
  }

  const category = await getCategoryById(categoryId);

  if (!category) {
    return (
      <div className="space-y-4">
        <Link href="/categories" className="text-blue-600 hover:underline">
          ← Back to categories
        </Link>
        <h1 className="text-2xl font-bold">Category not found</h1>
      </div>
    );
  }

  const sp: SearchParams = searchParams ? await searchParams : {};
  const requestedPage = parseBoundedInt(firstParam(sp.page), 1, 1, 1_000_000);
  const pageSize = parseBoundedInt(firstParam(sp.pageSize), 10, 1, 50);

  const { data: posts, meta } = await getCategoryPostsPage({ categoryId, page: requestedPage, pageSize });
  const { page, total, totalPages } = meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/categories" className="text-blue-600 hover:underline">
          ← Back to categories
        </Link>
        <div className="flex items-center gap-3">
          <Link href={`/categories/${category.id}/edit`} className="text-blue-600 hover:underline">
            Edit
          </Link>
          <form action={deleteCategory}>
            <input type="hidden" name="id" value={category.id} />
            <button type="submit" className="text-red-700 dark:text-red-300 hover:underline">
              Delete
            </button>
          </form>
        </div>
      </div>

      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{category.name}</h1>
        <p className="text-black/70 dark:text-white/70">Posts in this category</p>
      </header>

      <section className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/5 dark:bg-white/10">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Author</th>
                <th className="px-4 py-3 font-semibold">Published</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr className="border-t border-black/10 dark:border-white/10">
                  <td className="px-4 py-3 text-black/70 dark:text-white/70" colSpan={4}>
                    No posts in this category.
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr
                    key={post.id}
                    className="border-t border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/posts/${post.id}`} className="text-blue-600 hover:underline">
                        {post.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{post.author.name ?? post.author.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          post.published
                            ? "bg-green-600/15 text-green-700 dark:text-green-300"
                            : "bg-gray-600/15 text-gray-700 dark:text-gray-300",
                        ].join(" ")}
                      >
                        {post.published ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(post.updatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex items-center justify-between gap-4 text-sm">
        <div className="text-black/70 dark:text-white/70">
          Page {page} of {totalPages} · {total} total
        </div>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={buildHref(`/categories/${category.id}`, page - 1, pageSize)}
              className="px-3 py-1.5 rounded border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
            >
              Previous
            </Link>
          ) : (
            <span className="px-3 py-1.5 rounded border border-black/10 dark:border-white/10 text-black/40 dark:text-white/40">
              Previous
            </span>
          )}
          {page < totalPages ? (
            <Link
              href={buildHref(`/categories/${category.id}`, page + 1, pageSize)}
              className="px-3 py-1.5 rounded border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
            >
              Next
            </Link>
          ) : (
            <span className="px-3 py-1.5 rounded border border-black/10 dark:border-white/10 text-black/40 dark:text-white/40">
              Next
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
