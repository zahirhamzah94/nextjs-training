import Link from "next/link";
import { connection } from "next/server";

import { createPost } from "@/app/actions";
import { getPostNewData } from "@/lib/data";
import PostForm from "@/components/PostForm";

export default async function NewPostPage() {
  await connection();

  const { categories, users } = await getPostNewData();

  if (categories.length === 0 || users.length === 0) {
    return (
      <div className="space-y-4">
        <Link href="/posts" className="text-blue-600 hover:underline">
          ← Back to posts
        </Link>
        <h1 className="text-3xl font-bold">New Post</h1>
        <div className="text-black/70 dark:text-white/70">
          You need at least one category and one user before creating a post.
        </div>
        <div className="flex gap-3">
          <Link href="/categories/new" className="text-blue-600 hover:underline">
            Create category
          </Link>
          <Link href="/users/new" className="text-blue-600 hover:underline">
            Create user
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">New Post</h1>
        <p className="text-black/70 dark:text-white/70">Create a new post</p>
      </header>

      <PostForm
        action={createPost}
        submitLabel="Create"
        cancelHref="/posts"
        categories={categories.map((c) => ({ id: c.id, label: c.name }))}
        authors={users.map((u) => ({ id: u.id, label: u.name ?? u.email }))}
        defaultValues={{ published: false, categoryId: categories[0].id, authorId: users[0].id }}
      />
    </div>
  );
}
