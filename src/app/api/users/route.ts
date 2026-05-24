import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "TEAM_LEAD", "TEAM_MEMBER"]).default("TEAM_MEMBER"),
  marketingRole: z.string().max(100).optional().nullable(),
  department: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  departmentIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("activeOnly") !== "false";
  const departmentId = searchParams.get("departmentId");

  const users = await db.user.findMany({
    where: {
      ...(activeOnly && { isActive: true }),
      ...(departmentId && { departmentMemberships: { some: { departmentId } } }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      marketingRole: true,
      department: true,
      isActive: true,
      image: true,
      createdAt: true,
      departmentMemberships: {
        select: { departmentId: true, role: true },
      },
      _count: {
        select: { assignedTasks: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: users });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const exists = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
      marketingRole: parsed.data.marketingRole ?? null,
      department: parsed.data.department ?? null,
      isActive: parsed.data.isActive,
      ...(parsed.data.departmentIds && parsed.data.departmentIds.length > 0 && {
        departmentMemberships: {
          create: parsed.data.departmentIds.map((departmentId) => ({ departmentId, role: "MEMBER" })),
        },
      }),
    },
    select: { id: true, name: true, email: true, role: true, marketingRole: true, isActive: true },
  });

  return NextResponse.json({ data: user }, { status: 201 });
}
