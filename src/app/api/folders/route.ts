import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getAllowedDeptIds(session: { user: { id: string; email?: string | null; role?: string | null } }): Promise<string[] | null> {
  if (session.user.role === "ADMIN") return null;
  let dbUserId = session.user.id;
  if (session.user.email) {
    const me = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (me) dbUserId = me.id;
  }
  const memberships = await db.departmentMember.findMany({
    where: { userId: dbUserId },
    select: { departmentId: true },
  });
  return memberships.map((m) => m.departmentId);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const rawDeptId = searchParams.get("departmentId");

  const allowedDeptIds = await getAllowedDeptIds(session);

  let departmentFilter: { campaign: { departmentId: string | { in: string[] } } } | undefined;

  if (allowedDeptIds !== null) {
    // Non-admin: restrict to their own departments
    const effectiveDeptIds =
      rawDeptId && allowedDeptIds.includes(rawDeptId) ? [rawDeptId] : allowedDeptIds;
    if (effectiveDeptIds.length > 0) {
      departmentFilter = { campaign: { departmentId: { in: effectiveDeptIds } } };
    }
  } else if (rawDeptId) {
    const dept = await db.department.findUnique({ where: { id: rawDeptId }, select: { id: true } });
    if (dept) departmentFilter = { campaign: { departmentId: dept.id } };
  }

  const folders = await db.projectFolder.findMany({
    where: departmentFilter,
    orderBy: { createdAt: "desc" },
    include: {
      campaign: { select: { id: true, name: true } },
      _count: { select: { lists: true } },
    },
  });

  return NextResponse.json({ data: folders });
}
