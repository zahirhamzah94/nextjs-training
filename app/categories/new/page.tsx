import { connection } from "next/server";

import { createCategory } from "@/app/actions";
import CategoryForm from "@/components/CategoryForm";

export default async function NewCategoryPage() {
  await connection();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">New Category</h1>
        <p className="text-black/70 dark:text-white/70">Create a new category</p>
      </header>

      <CategoryForm action={createCategory} submitLabel="Create" cancelHref="/categories" />
    </div>
  );
}
