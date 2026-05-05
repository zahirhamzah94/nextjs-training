import Link from "next/link";
import { connection } from "next/server";

import { deleteCategory } from "@/app/actions";
import { getCategoriesPage } from "@/lib/data";

type SearchParams = { [key: string]: string | string[] | undefined };

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseBoundedInt(value: string | undefined, fallback: number, min: number, max: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function buildHref(pathname: string, page: number, pageSize: number) {
  return `${pathname}?page=${page}&pageSize=${pageSize}`;
}

export default async function CategoriesPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await connection();

  const sp = await (searchParams ?? Promise.resolve({}));
  const requestedPage = parseBoundedInt(firstParam(sp.page), 1, 1, 1_000_000);
  const pageSize = parseBoundedInt(firstParam(sp.pageSize), 10, 1, 50);

  const { data: categories, meta } = await getCategoriesPage({ page: requestedPage, pageSize });
  const { page, total, totalPages } = meta;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-black/70 dark:text-white/70">Browse posts by category</p>
        </div>
        <Link
          href="/categories/new"
          className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black"
        >
          New Category
        </Link>
      </header>

      <section className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/5 dark:bg-white/10">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Posts</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr className="border-t border-black/10 dark:border-white/10">
                  <td className="px-4 py-3 text-black/70 dark:text-white/70" colSpan={3}>
                    No categories found.
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr
                    key={category.id}
                    className="border-t border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/categories/${category.id}`} className="text-blue-600 hover:underline">
                        {category.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{category._count.posts}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
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
                    </td>
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
              href={buildHref("/categories", page - 1, pageSize)}
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
              href={buildHref("/categories", page + 1, pageSize)}
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
