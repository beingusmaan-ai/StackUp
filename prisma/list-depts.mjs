import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const depts = await db.department.findMany({ orderBy: { name: "asc" } });
console.log(JSON.stringify(depts, null, 2));
await db.$disconnect();
