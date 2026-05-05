import "dotenv/config";
import { prisma } from "../lib/db";

async function main() {

  console.log('seed started');
  const dataCategory = await prisma.category.createMany({
    data: [
      { name: "Web Development" },
      { name: "Data Science" },
      { name: "Machine Learning" },
      { name: "Cloud Computing" },
    ],
    skipDuplicates: true,
  });

  console.log('Categories created:', dataCategory.count);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      role: "ADMIN",
      profile: {
        create: { bio: "Administrator" },
      },
      posts: {
        create: [
          {
            title: "Welcome to Trainer Portal",
            published: true,
            category: {
              connect: { name: "Web Development" }
            },
          },
        ],
      },
    },
  });
  console.log('Admin user created:', admin.id);

  const trainer = await prisma.user.upsert({
    where: { email: "trainer@example.com" },
    update: {},
    create: {
      email: "trainer@example.com",
      name: "Expert Trainer",
      role: "TRAINER",
      profile: {
        create: { bio: "Expert Trainer" }
      },
      posts: {
        create: [
          {
            title: "How to teach Next.js",
            content: "Step 1...",
            published: true,
            category: {
              connect: { name: "Web Development" }
            },
          },
          {
            title: "Prisma Best Practices",
            content: "Here are some best practices for using Prisma...",
            published: false,
            category: {
              connect: { name: "Data Science" }
            },
          },
        ],
      },
    },
  });
  console.log('Trainer user created:', trainer.id);
  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
