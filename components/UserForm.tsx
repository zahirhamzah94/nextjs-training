import Link from "next/link";

/**
 * User create/edit form used by the Users pages.
 *
 * Flow:
 * - UI renders inputs with `defaultValues` (edit) or empty values (create).
 * - On submit, Next.js sends a FormData POST to the provided `action` (a Server Action).
 * - The action validates, writes to Prisma (often inside a transaction), then redirects.
 *
 * Notes:
 * - When editing, a hidden `id` field is included so the Server Action knows which record to update.
 * - `role` is normalized to a valid default to keep the select controlled by `defaultValue`.
 */
type Role = "USER" | "TRAINER" | "ADMIN";

export default function UserForm({
  action,
  submitLabel,
  cancelHref,
  defaultValues,
}: {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  cancelHref: string;
  defaultValues?: {
    id?: number;
    email?: string;
    name?: string | null;
    role?: Role;
    bio?: string | null;
  };
}) {
  const hasId = Boolean(defaultValues?.id);
  const role: Role = defaultValues?.role ?? "USER";

  return (
    <form action={action} className="space-y-4">
      {hasId ? <input type="hidden" name="id" value={defaultValues!.id} /> : null}

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={defaultValues?.email ?? ""}
          className="w-full rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
          required
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          defaultValue={defaultValues?.name ?? ""}
          className="w-full rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="role" className="text-sm font-medium">
          Role
        </label>
        <select
          id="role"
          name="role"
          defaultValue={role}
          className="w-full rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
        >
          <option value="USER">USER</option>
          <option value="TRAINER">TRAINER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="bio" className="text-sm font-medium">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={defaultValues?.bio ?? ""}
          rows={4}
          className="w-full rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2"
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
