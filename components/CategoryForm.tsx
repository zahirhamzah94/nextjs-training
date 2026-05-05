import Link from "next/link";

export default function CategoryForm({
  action,
  submitLabel,
  cancelHref,
  defaultValues,
}: {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  cancelHref: string;
  defaultValues?: { id?: number; name?: string };
}) {
  return (
    <form action={action} className="space-y-4">
      {defaultValues?.id ? <input type="hidden" name="id" value={defaultValues.id} /> : null}

      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          defaultValue={defaultValues?.name ?? ""}
          className="w-full rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
          required
        />
      </div>

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
