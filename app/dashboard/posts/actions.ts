"use server";

import { prisma } from "@/lib/db";
import { requireAnyRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const formSchema = z.object({
  title: z.string().min(3),
});

export async function createPostAction(formData: FormData) {
  await requireAnyRole(["admin", "editor"]);
  const title = formData.get("title");

  // Validation
  const parsed = formSchema.safeParse({ title });
  if (!parsed.success) {
    throw new Error("Invalid form data");
  }

  // Mutation
  await prisma.post.create({
    data: { 
        title: parsed.data.title, 
        authorId: 1, 
        categoryId: 1 
    }, // Hardcoded author for now
  });

  // Revalidate cache
  revalidatePath("/dashboard/posts");
}
