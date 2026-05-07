import { Suspense } from "react";
import PostsTable from "./PostsTable";
import { createPostAction } from "./actions";

// export const revalidate = 60; // ISR: Revalidate every 60 seconds

export default function PostsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Posts Management</h1>

      <form action={createPostAction} className="mb-8 flex gap-4">
        <input
          type="text"
          name="title"
          placeholder="New Post Title"
          className="border p-2 rounded"
          required
        />
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Add Post
        </button>
      </form>

      <Suspense fallback={<p>Loading posts...</p>}>
        <PostsTable />
      </Suspense>
    </div>
  );
}
