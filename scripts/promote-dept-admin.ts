import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const user = await db.user.findFirst({
    where: { name: { contains: "Ahmed", mode: "insensitive" } },
    select: { id: true, name: true, email: true },
  });

  if (!user) { console.error("User not found"); process.exit(1); }
  console.log("Found user:", user.name, user.email);

  const sales = await db.department.findFirst({
    where: { name: { contains: "Sales", mode: "insensitive" } },
    select: { id: true, name: true },
  });

  if (!sales) { console.error("Sales department not found"); process.exit(1); }
  console.log("Found dept:", sales.name, sales.id);

  const result = await db.departmentMember.upsert({
    where: { departmentId_userId: { departmentId: sales.id, userId: user.id } },
    create: { departmentId: sales.id, userId: user.id, role: "ADMIN" },
    update: { role: "ADMIN" },
  });

  console.log("Done — DepartmentMember role set to:", result.role);
}

main().catch(console.error).finally(() => db.$disconnect());
