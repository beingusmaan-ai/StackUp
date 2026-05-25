import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  let teamFilter = {};
  if (teamId) {
    const dept = await db.department.findUnique({ where: { id: teamId }, select: { id: true } });
    if (dept) {
      const memberships = await db.departmentMember.findMany({
        where: { departmentId: teamId },
        select: { userId: true },
      });
      const memberIds = memberships.map((m) => m.userId);
      teamFilter = {
        OR: [
          { assignedDepartmentId: teamId },
          ...(memberIds.length > 0 ? [{ assignees: { some: { userId: { in: memberIds } } } }] : []),
        ],
      };
    }
  }

  const tasks = await db.task.findMany({
    where: { ...teamFilter, dueDate: { not: null }, status: { not: "COMPLETED" } },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      startDate: true,
      assignees: { include: { user: { select: { id: true, name: true } } } },
      campaign: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json({ data: tasks });
}
