import Link from "next/link";

type SelectOption = { id: number; label: string };

export default function PostForm({
  action,
  submitLabel,
  cancelHref,
  categories,
  authors,
  defaultValues,
}: {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  cancelHref: string;
  categories: SelectOption[];
  authors: SelectOption[];
  defaultValues?: {
    id?: number;
    title?: string;
    content?: string | null;
    published?: boolean;
    categoryId?: number;
    authorId?: number;
  };
}) {
  const hasId = Boolean(defaultValues?.id);

  return (
    <form action={action} className="space-y-4">
      {hasId ? <input type="hidden" name="id" value={defaultValues!.id} /> : null}

      <div className="space-y-1">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
          defaultValue={defaultValues?.title ?? ""}
          className="w-full rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
          required
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="categoryId" className="text-sm font-medium">
          Category
        </label>
        <select
          id="categoryId"
          name="categoryId"
          defaultValue={defaultValues?.categoryId ?? (categories[0]?.id ?? "")}
          className="w-full rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
          required
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="authorId" className="text-sm font-medium">
          Author
        </label>
        <select
          id="authorId"
          name="authorId"
          defaultValue={defaultValues?.authorId ?? (authors[0]?.id ?? "")}
          className="w-full rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
          required
        >
          {authors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="content" className="text-sm font-medium">
          Content
        </label>
        <textarea
          id="content"
          name="content"
          defaultValue={defaultValues?.content ?? ""}
          rows={8}
          className="w-full rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={defaultValues?.published ?? false} />
        Published
      </label>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black"
        >
          {submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="px-4 py-2 rounded border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
