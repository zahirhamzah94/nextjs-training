import Link from "next/link";
import { connection } from "next/server";

import { updateCategory } from "@/app/actions";
import { getCategoryById } from "@/lib/data";
import CategoryForm from "@/components/CategoryForm";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Edit Category</h1>
          <p className="text-black/70 dark:text-white/70">Update category details</p>
        </div>
        <Link href={`/categories/${category.id}`} className="text-blue-600 hover:underline">
          View
        </Link>
      </header>

      <CategoryForm
        action={updateCategory}
        submitLabel="Save"
        cancelHref={`/categories/${category.id}`}
        defaultValues={{ id: category.id, name: category.name }}
      />
    </div>
  );
}
