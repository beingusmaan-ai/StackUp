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

  const isGlobalAdmin = session.user.role === "ADMIN";

  // Non-admins can only see users from their own departments
  let allowedDeptIds: string[] | null = null;
  if (!isGlobalAdmin) {
    let dbUserId = session.user.id;
    if (session.user.email) {
      const me = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      if (me) dbUserId = me.id;
    }
    const memberships = await db.departmentMember.findMany({
      where: { userId: dbUserId },
      select: { departmentId: true },
    });
    allowedDeptIds = memberships.map((m) => m.departmentId);
  }

  // Compute effective dept filter
  let deptFilter: { departmentId: string } | { departmentId: { in: string[] } } | undefined;
  if (allowedDeptIds !== null) {
    const effectiveDeptIds =
      departmentId && allowedDeptIds.includes(departmentId) ? [departmentId] : allowedDeptIds;
    if (effectiveDeptIds.length > 0) {
      deptFilter = { departmentId: { in: effectiveDeptIds } };
    }
  } else if (departmentId) {
    deptFilter = { departmentId };
  }

  const users = await db.user.findMany({
    where: {
      ...(activeOnly && { isActive: true }),
      ...(deptFilter && { departmentMemberships: { some: deptFilter } }),
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
      statusEmoji: true,
      statusMessage: true,
      statusExpiresAt: true,
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

  const isGlobalAdmin = session.user.role === "ADMIN";

  // Resolve caller's real DB ID
  let callerDbId = session.user.id;
  if (session.user.email) {
    const me = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (me) callerDbId = me.id;
  }

  // Allow dept admins to create users too
  let callerAdminDeptIds: string[] = [];
  if (!isGlobalAdmin) {
    const adminRows = await db.departmentMember.findMany({
      where: { userId: callerDbId, role: "ADMIN" },
      select: { departmentId: true },
    });
    callerAdminDeptIds = adminRows.map((r) => r.departmentId);
    if (callerAdminDeptIds.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  // Dept admins cannot grant ADMIN role
  if (!isGlobalAdmin && parsed.data.role === "ADMIN") {
    return NextResponse.json({ error: "Department admins cannot grant ADMIN role" }, { status: 403 });
  }

  // Dept admins can only add users to their own depts
  const effectiveDeptIds = isGlobalAdmin
    ? (parsed.data.departmentIds ?? [])
    : (parsed.data.departmentIds ?? []).filter((id) => callerAdminDeptIds.includes(id));

  // If dept admin provided no valid depts, default to first of their admin depts
  const finalDeptIds = !isGlobalAdmin && effectiveDeptIds.length === 0
    ? callerAdminDeptIds.slice(0, 1)
    : effectiveDeptIds;

  const exists = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: isGlobalAdmin ? parsed.data.role : "TEAM_MEMBER",
      marketingRole: parsed.data.marketingRole ?? null,
      department: parsed.data.department ?? null,
      isActive: parsed.data.isActive,
      ...(finalDeptIds.length > 0 && {
        departmentMemberships: {
          create: finalDeptIds.map((departmentId) => ({ departmentId, role: "MEMBER" })),
        },
      }),
    },
    select: { id: true, name: true, email: true, role: true, marketingRole: true, isActive: true },
  });

  return NextResponse.json({ data: user }, { status: 201 });
}
