import { prisma } from "@/lib/db";

export default async function PostsTable() {
  // Simulate slow network to demonstrate Suspense
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <table className="w-full bg-white border">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2 border">ID</th>
          <th className="p-2 border">Title</th>
        </tr>
      </thead>
      <tbody>
        {posts.map((post) => (
          <tr key={post.id}>
            <td className="p-2 border">{post.id}</td>
            <td className="p-2 border">{post.title}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}