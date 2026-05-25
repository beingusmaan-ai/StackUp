import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  PRIORITY_POINTS, ACTIVE_STATUSES, resolveCapacity, computeWorkloadStatus,
  type WorkloadInsight,
} from "@/lib/workload";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  const now = new Date();

  let userWhere: Record<string, unknown> = { isActive: true };
  let teamMemberIds: string[] | null = null;
  if (teamId) {
    const dept = await db.department.findUnique({ where: { id: teamId }, select: { id: true } });
    if (dept) {
      const memberRows = await db.departmentMember.findMany({
        where: { departmentId: teamId },
        select: { userId: true },
      });
      if (memberRows.length > 0) {
        teamMemberIds = memberRows.map((m) => m.userId);
        userWhere = { isActive: true, id: { in: teamMemberIds } };
      }
    }
  }

  const users = await db.user.findMany({
    where: userWhere,
    select: {
      id: true,
      name: true,
      email: true,
      marketingRole: true,
      department: true,
      image: true,
      assignedTasks: {
        include: {
          task: {
            select: {
              id: true,
              title: true,
              priority: true,
              status: true,
              dueDate: true,
              estimatedHours: true,
              taskType: true,
              campaign: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const campaignWhere = teamId
    ? { OR: [{ departmentId: teamId }, ...(teamMemberIds ? [{ ownerId: { in: teamMemberIds } }] : [])] }
    : {};
  const campaigns = await db.campaign.findMany({
    where: campaignWhere,
    select: {
      id: true,
      name: true,
      tasks: {
        where: { status: { in: ACTIVE_STATUSES } },
        select: { id: true, priority: true, status: true },
      },
    },
  });

  const userWorkloads = users.map((user) => {
    const activeTasks = user.assignedTasks
      .map((a) => a.task)
      .filter((t) => ACTIVE_STATUSES.includes(t.status));
    const overdueTasks = activeTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now);
    const workloadScore = activeTasks.reduce(
      (sum, t) => sum + (PRIORITY_POINTS[t.priority] ?? 10),
      0
    );
    const capacity = resolveCapacity(user.marketingRole);
    const capacityUsage = capacity > 0 ? (workloadScore / capacity) * 100 : 0;
    const status = computeWorkloadStatus(capacityUsage);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      marketingRole: user.marketingRole,
      department: user.department,
      image: user.image,
      weeklyCapacity: capacity,
      activeTasks: activeTasks.length,
      overdueTasks: overdueTasks.length,
      workloadScore,
      capacityUsage: Math.round(capacityUsage * 10) / 10,
      status,
      remainingPoints: capacity - workloadScore,
      tasks: activeTasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate?.toISOString() ?? null,
        estimatedHours: t.estimatedHours,
        taskType: t.taskType,
        campaign: t.campaign ? { id: t.campaign.id, name: t.campaign.name } : null,
      })),
    };
  });

  const campaignWorkloads = campaigns
    .filter((c) => c.tasks.length > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      workloadScore: c.tasks.reduce((sum, t) => sum + (PRIORITY_POINTS[t.priority] ?? 10), 0),
      taskCount: c.tasks.length,
    }))
    .sort((a, b) => b.workloadScore - a.workloadScore)
    .slice(0, 6);

  const totalCapacity = userWorkloads.reduce((s, u) => s + u.weeklyCapacity, 0);
  const activeWorkload = userWorkloads.reduce((s, u) => s + u.workloadScore, 0);
  const overloadedCount = userWorkloads.filter((u) => u.status === "overloaded").length;
  const availableCapacity = userWorkloads
    .filter((u) => u.status !== "overloaded")
    .reduce((s, u) => s + Math.max(0, u.remainingPoints), 0);
  const delayedTaskRisk = userWorkloads.reduce((s, u) => s + u.overdueTasks, 0);

  const insights: WorkloadInsight[] = [];

  for (const u of userWorkloads.filter((u) => u.status === "overloaded")) {
    insights.push({
      type: "warning",
      message: `${u.name} is overloaded at ${Math.round(u.capacityUsage)}% capacity (+${Math.round(u.capacityUsage - 100)}% over limit)`,
      userId: u.id,
    });
  }

  for (const u of userWorkloads.filter((u) => u.status === "high_load")) {
    insights.push({
      type: "warning",
      message: `${u.name} is at ${Math.round(u.capacityUsage)}% — consider reassigning before overload`,
      userId: u.id,
    });
  }

  for (const u of userWorkloads.filter((u) => u.overdueTasks > 0)) {
    insights.push({
      type: "warning",
      message: `${u.name} has ${u.overdueTasks} overdue task${u.overdueTasks > 1 ? "s" : ""} risking campaign delivery`,
      userId: u.id,
    });
  }

  const availableUsers = userWorkloads
    .filter((u) => u.status === "healthy" && u.remainingPoints > 15)
    .sort((a, b) => b.remainingPoints - a.remainingPoints);

  for (const u of availableUsers.slice(0, 2)) {
    insights.push({
      type: "suggestion",
      message: `${u.name} has ${u.remainingPoints} pts available (${Math.round(100 - u.capacityUsage)}% free) — ready for more tasks`,
      userId: u.id,
    });
  }

  const overloaded = userWorkloads.filter((u) => u.status === "overloaded");
  for (const from of overloaded.slice(0, 2)) {
    const to = availableUsers.find((u) => u.id !== from.id);
    if (to) {
      insights.push({
        type: "suggestion",
        message: `Move tasks from ${from.name} to ${to.name} to rebalance workload`,
        userId: from.id,
        targetUserId: to.id,
      });
    }
  }

  return NextResponse.json({
    users: userWorkloads,
    campaigns: campaignWorkloads,
    insights: insights.slice(0, 8),
    summary: { totalCapacity, activeWorkload, overloadedCount, availableCapacity, delayedTaskRisk },
  });
}
