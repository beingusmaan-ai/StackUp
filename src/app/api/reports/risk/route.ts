import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const rawDeptId = searchParams.get("departmentId");

  let departmentId: string | null = null;
  if (rawDeptId) {
    const dept = await db.department.findUnique({ where: { id: rawDeptId }, select: { id: true } });
    if (dept) departmentId = dept.id;
  }

  const now = new Date();

  const [campaigns, userWorkloads] = await Promise.all([
    db.campaign.findMany({
      where: {
        status: "ACTIVE",
        ...(departmentId ? { departmentId } : {}),
      },
      orderBy: { endDate: "asc" },
      include: {
        owner: { select: { name: true } },
        tasks: {
          where: { parentTaskId: null },
          select: {
            status: true,
            dueDate: true,
            assignees: {
              select: { user: { select: { id: true, name: true } } },
            },
          },
        },
      },
    }),
    db.user.findMany({
      where: {
        isActive: true,
        ...(departmentId ? { departmentMemberships: { some: { departmentId } } } : {}),
      },
      include: {
        assignedTasks: {
          include: { task: { select: { status: true } } },
        },
      },
    }),
  ]);

  const overloadedMap: Record<string, string> = {};
  userWorkloads.forEach((u) => {
    const active = u.assignedTasks.filter((a) => a.task.status !== "COMPLETED").length;
    if (active > 10) overloadedMap[u.id] = u.name ?? u.id;
  });

  const data = campaigns.map((c) => {
    const total = c.tasks.length;
    const done = c.tasks.filter((t) => t.status === "COMPLETED").length;
    const blocked = c.tasks.filter((t) => t.status === "BLOCKED").length;
    const pending = c.tasks.filter((t) => t.status !== "COMPLETED").length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    const daysRemaining = c.endDate
      ? Math.ceil((c.endDate.getTime() - now.getTime()) / 86400000)
      : null;

    const assigneeIds = new Set<string>();
    c.tasks.forEach((t) => t.assignees.forEach((a) => assigneeIds.add(a.user.id)));
    const overloadedAssignees = [...assigneeIds]
      .filter((id) => overloadedMap[id])
      .map((id) => overloadedMap[id]);

    let risk: "safe" | "watch" | "risk" | "critical" = "safe";
    if (daysRemaining !== null && daysRemaining < 0) risk = "critical";
    else if (daysRemaining !== null && daysRemaining <= 3 && progress < 90) risk = "critical";
    else if (blocked >= 5 || (daysRemaining !== null && daysRemaining <= 7 && progress < 70)) risk = "risk";
    else if (blocked >= 3 || (daysRemaining !== null && daysRemaining <= 14 && progress < 50)) risk = "watch";
    else if (overloadedAssignees.length > 0) risk = "watch";

    const suggestions: string[] = [];
    if (overloadedAssignees.length > 0) suggestions.push(`Reassign tasks from ${overloadedAssignees.slice(0, 2).join(", ")}`);
    if (blocked > 0) suggestions.push(`Resolve ${blocked} blocked task${blocked > 1 ? "s" : ""}`);
    if (daysRemaining !== null && daysRemaining <= 3 && pending > 5) suggestions.push("Consider extending the deadline");
    if (pending > 10 && daysRemaining !== null && daysRemaining <= 7) suggestions.push("Increase team resources on this campaign");

    return {
      campaignId: c.id,
      campaignName: c.name,
      deadline: c.endDate?.toISOString() ?? null,
      daysRemaining,
      progress,
      totalTasks: total,
      pendingTasks: pending,
      blockedTasks: blocked,
      overloadedAssignees,
      riskLevel: risk,
      suggestions,
    };
  });

  return NextResponse.json({ data });
}
