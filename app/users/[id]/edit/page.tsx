import Link from "next/link";
import { connection } from "next/server";

import { updateUser } from "@/app/actions";
import { getUserById } from "@/lib/data";
import UserForm from "@/components/UserForm";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();

  const { id } = await params;
  const userId = Number(id);

  if (!Number.isFinite(userId)) {
    return (
      <div className="space-y-4">
        <Link href="/users" className="text-blue-600 hover:underline">
          ← Back to users
        </Link>
        <h1 className="text-2xl font-bold">Invalid user id</h1>
      </div>
    );
  }

  const user = await getUserById(userId);

  if (!user) {
    return (
      <div className="space-y-4">
        <Link href="/users" className="text-blue-600 hover:underline">
          ← Back to users
        </Link>
        <h1 className="text-2xl font-bold">User not found</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Edit User</h1>
        <p className="text-black/70 dark:text-white/70">Update user details</p>
      </header>

      <UserForm
        action={updateUser}
        submitLabel="Save"
        cancelHref="/users"
        defaultValues={{
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          bio: user.profile?.bio ?? "",
        }}
      />
    </div>
  );
}
