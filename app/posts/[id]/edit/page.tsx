import Link from "next/link";
import { connection } from "next/server";

import { updatePost } from "@/app/actions";
import { getPostEditData } from "@/lib/data";
import PostForm from "@/components/PostForm";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { post, categories, users } = await getPostEditData(postId);

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
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Edit Post</h1>
          <p className="text-black/70 dark:text-white/70">Update post details</p>
        </div>
        <Link href={`/posts/${post.id}`} className="text-blue-600 hover:underline">
          View
        </Link>
      </header>

      <PostForm
        action={updatePost}
        submitLabel="Save"
        cancelHref={`/posts/${post.id}`}
        categories={categories.map((c) => ({ id: c.id, label: c.name }))}
        authors={users.map((u) => ({ id: u.id, label: u.name ?? u.email }))}
        defaultValues={{
          id: post.id,
          title: post.title,
          content: post.content,
          published: post.published,
          categoryId: post.categoryId,
          authorId: post.authorId,
        }}
      />
    </div>
  );
}
