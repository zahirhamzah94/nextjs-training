import Link from "next/link";
import { connection } from "next/server";

import { deletePost } from "@/app/actions";
import { getPostById } from "@/lib/data";

function formatDateTime(value: Date) {
  return value.toISOString().replace("T", " ").slice(0, 16);
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();

  const { id } = await params;
  const postId = Number(id);

  if (!Number.isFinite(postId)) {
    return (
      <div className="space-y-4">
        <Link href="/posts" className="text-blue-600 hover:underline">
          ← Back to posts
        </Link>
        <h1 className="text-2xl font-bold">Invalid post id</h1>
      </div>
    );
  }

  const post = await getPostById(postId);

  if (!post) {
    return (
      <div className="space-y-4">
        <Link href="/posts" className="text-blue-600 hover:underline">
          ← Back to posts
        </Link>
        <h1 className="text-2xl font-bold">Post not found</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/posts" className="text-blue-600 hover:underline">
          ← Back to posts
        </Link>
        <div className="flex items-center gap-3">
          <Link href={`/posts/${post.id}/edit`} className="text-blue-600 hover:underline">
            Edit
          </Link>
          <form action={deletePost}>
            <input type="hidden" name="id" value={post.id} />
            <button type="submit" className="text-red-700 dark:text-red-300 hover:underline">
              Delete
            </button>
          </form>
          <span
            className={[
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              post.published
                ? "bg-green-600/15 text-green-700 dark:text-green-300"
                : "bg-gray-600/15 text-gray-700 dark:text-gray-300",
            ].join(" ")}
          >
            {post.published ? "Published" : "Draft"}
          </span>
        </div>
      </div>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{post.title}</h1>
        <div className="text-sm text-black/70 dark:text-white/70 flex flex-wrap gap-x-4 gap-y-1">
          <span>
            Category:{" "}
            <Link href={`/categories/${post.category.id}`} className="text-blue-600 hover:underline">
              {post.category.name}
            </Link>
          </span>
          <span>Author: {post.author.name ?? post.author.email}</span>
          <span>Created: {formatDateTime(post.createdAt)}</span>
          <span>Updated: {formatDateTime(post.updatedAt)}</span>
        </div>
      </header>

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-4">
        {post.content ? (
          <div className="whitespace-pre-wrap leading-relaxed">{post.content}</div>
        ) : (
          <div className="text-black/70 dark:text-white/70">No content.</div>
        )}
      </section>
    </div>
  );
}
