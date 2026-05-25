import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  const now = new Date();

  // Resolve caller's real DB user ID
  let callerDbId = session.user.id;
  if (session.user.email) {
    const me = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (me) callerDbId = me.id;
  }

  // All teams for the overview grid (always unfiltered)
  const teams = await db.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true } } },
  });

  // Resolve team filter — global admins always see all users
  let memberIdFilter: { id: { in: string[] } } | undefined;
  let activeTeamName: string | null = null;
  const isGlobalAdmin = session.user.role === "ADMIN";

  if (teamId) {
    const dept = await db.department.findUnique({
      where: { id: teamId },
      select: { id: true, name: true },
    });
    if (dept) {
      activeTeamName = dept.name;
      const memberships = await db.departmentMember.findMany({
        where: { departmentId: teamId },
        select: { userId: true },
      });
      if (memberships.length > 0) {
        memberIdFilter = { id: { in: memberships.map((m) => m.userId) } };
      }
    }
  }

  const users = await db.user.findMany({
    where: { isActive: true, ...memberIdFilter },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      marketingRole: true,
      image: true,
      assignedTasks: {
        select: { task: { select: { status: true, dueDate: true } } },
      },
    },
  });

  const usersWithStats = users.map((user) => {
    const assigned  = user.assignedTasks.length;
    const completed = user.assignedTasks.filter((a) => a.task.status === "COMPLETED").length;
    const delayed   = user.assignedTasks.filter(
      (a) => a.task.dueDate && new Date(a.task.dueDate) < now && a.task.status !== "COMPLETED"
    ).length;
    const rate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      marketingRole: user.marketingRole ?? null,
      image: user.image ?? null,
      assigned,
      completed,
      delayed,
      rate,
    };
  });

  // Dept IDs where caller is a dept admin
  let adminDeptIds: string[] = [];
  if (session.user.role === "ADMIN") {
    adminDeptIds = teams.map((t) => t.id);
  } else {
    const adminRows = await db.departmentMember.findMany({
      where: { userId: callerDbId, role: "ADMIN" },
      select: { departmentId: true },
    });
    adminDeptIds = adminRows.map((r) => r.departmentId);
  }

  // User IDs who are dept admins in the active team
  let deptAdminUserIds: string[] = [];
  if (teamId) {
    const adminMemberships = await db.departmentMember.findMany({
      where: { departmentId: teamId, role: "ADMIN" },
      select: { userId: true },
    });
    deptAdminUserIds = adminMemberships.map((m) => m.userId);
  }

  return NextResponse.json({ users: usersWithStats, teams, activeTeamName, adminDeptIds, deptAdminUserIds });
}
