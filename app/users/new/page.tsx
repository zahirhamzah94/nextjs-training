import { connection } from "next/server";

import { createUser } from "@/app/actions";
import UserForm from "@/components/UserForm";

export default async function NewUserPage() {
  await connection();

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
