import { createUser } from "@/app/actions";
import UserForm from "@/components/UserForm";

/**
 * New User page.
 *
 * Flow:
 * - Render <UserForm/> with the `createUser` Server Action.
 * - Action validates, creates user (+ optional profile bio), writes audit log, revalidates, then redirects.
 *
 * Note:
 * - No DB reads are required to render this page.
 */
export default async function NewUserPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">New User</h1>
        <p className="text-black/70 dark:text-white/70">Create a new user</p>
      </header>

      <UserForm action={createUser} submitLabel="Create" cancelHref="/users" defaultValues={{ role: "USER" }} />
    </div>
  );
}
