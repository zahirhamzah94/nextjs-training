import { createCategory } from "@/app/actions";
import CategoryForm from "@/components/CategoryForm";

/**
 * New Category page.
 *
 * Flow:
 * - Render <CategoryForm/> with `createCategory` Server Action.
 * - On submit, the action validates, creates the row (+ audit log), revalidates, and redirects to `/categories`.
 *
 * Note:
 * - No DB reads are required to render this page, so it stays simple and avoids request-time APIs.
 */
export default async function NewCategoryPage() {
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
