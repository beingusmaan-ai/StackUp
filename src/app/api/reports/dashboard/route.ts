import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function trendPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const rawDeptId = searchParams.get("departmentId");

  // Validate departmentId exists; fall back to no filter if stale
  let departmentId: string | null = null;
  if (rawDeptId) {
    const dept = await db.department.findUnique({ where: { id: rawDeptId }, select: { id: true } });
    if (dept) departmentId = dept.id;
  }

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7); weekAgo.setHours(0, 0, 0, 0);
  const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14); twoWeeksAgo.setHours(0, 0, 0, 0);

  const taskDeptFilter = departmentId ? {
    OR: [
      { assignedDepartmentId: departmentId },
      { campaign: { departmentId } },
      { assignees: { some: { user: { departmentMemberships: { some: { departmentId } } } } } },
    ],
  } : {};

  const campaignDeptFilter = departmentId ? { departmentId } : {};
  const userDeptFilter = departmentId ? { departmentMemberships: { some: { departmentId } } } : {};

  const [
    activeTasks,
    completedThisWeek,
    completedLastWeek,
    overdueTasks,
    activeCampaigns,
    approvalPending,
    recentCompleted,
    statusCounts,
    campaignsData,
    activeUsers,
  ] = await Promise.all([
    db.task.count({ where: { ...taskDeptFilter, status: { notIn: ["COMPLETED"] }, parentTaskId: null } }),
    db.task.count({ where: { ...taskDeptFilter, status: "COMPLETED", completedAt: { gte: weekAgo } } }),
    db.task.count({ where: { ...taskDeptFilter, status: "COMPLETED", completedAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    db.task.count({ where: { ...taskDeptFilter, dueDate: { lt: todayStart }, status: { notIn: ["COMPLETED"] }, parentTaskId: null } }),
    db.campaign.count({ where: { status: "ACTIVE", ...campaignDeptFilter } }),
    db.task.count({ where: { ...taskDeptFilter, status: "WAITING_APPROVAL" } }),
    db.task.findMany({
      where: { ...taskDeptFilter, status: "COMPLETED", completedAt: { gte: weekAgo } },
      select: { completedAt: true },
    }),
    db.task.groupBy({
      by: ["status"],
      where: { ...taskDeptFilter, parentTaskId: null },
      _count: { _all: true },
    }),
    db.campaign.findMany({
      where: { status: "ACTIVE", ...campaignDeptFilter },
      include: { tasks: { select: { status: true } } },
    }),
    db.user.findMany({
      where: { isActive: true, ...userDeptFilter },
      include: {
        assignedTasks: {
          include: { task: { select: { status: true } } },
        },
      },
    }),
  ]);

  const trendMap: Record<string, number> = {};
  recentCompleted.forEach((t) => {
    if (t.completedAt) {
      const key = t.completedAt.toISOString().split("T")[0];
      trendMap[key] = (trendMap[key] || 0) + 1;
    }
  });
  const completionTrend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split("T")[0];
    return {
      date: d.toLocaleDateString("en-US", { weekday: "short" }),
      completed: trendMap[key] || 0,
    };
  });

  const deadlinesAtRisk = campaignsData.filter((c) => {
    if (!c.endDate) return false;
    const daysLeft = Math.ceil((c.endDate.getTime() - now.getTime()) / 86400000);
    const total = c.tasks.length;
    const done = c.tasks.filter((t) => t.status === "COMPLETED").length;
    const progress = total > 0 ? done / total : 0;
    return daysLeft >= 0 && daysLeft <= 7 && progress < 0.8;
  }).length;

  const capacities = activeUsers.map((u) => {
    const active = u.assignedTasks.filter((a) => a.task.status !== "COMPLETED").length;
    return (active / 10) * 100;
  });
  const avgCapacity = capacities.length > 0
    ? Math.round(capacities.reduce((a, b) => a + b, 0) / capacities.length)
    : 0;

  const statusBreakdown = statusCounts.map((s) => ({
    status: s.status.replace(/_/g, " "),
    count: s._count._all,
  }));

  const insights: { type: "warning" | "info"; text: string }[] = [];
  activeUsers.forEach((u) => {
    const active = u.assignedTasks.filter((a) => a.task.status !== "COMPLETED").length;
    const cap = (active / 10) * 100;
    if (cap > 100) insights.push({ type: "warning", text: `${u.name} workload exceeds ${Math.round(cap)}% capacity` });
    else if (active <= 2) insights.push({ type: "info", text: `${u.name} has available capacity (${active} active tasks)` });
  });
  if (approvalPending > 0) insights.push({ type: "warning", text: `${approvalPending} task${approvalPending > 1 ? "s" : ""} waiting for approval` });
  if (overdueTasks > 0) insights.push({ type: "warning", text: `${overdueTasks} overdue task${overdueTasks > 1 ? "s" : ""} need immediate attention` });
  if (deadlinesAtRisk > 0) insights.push({ type: "warning", text: `${deadlinesAtRisk} project${deadlinesAtRisk > 1 ? "s" : ""} at risk of missing deadline` });

  return NextResponse.json({
    kpis: {
      activeTasks: { value: activeTasks, trend: 0 },
      completedThisWeek: { value: completedThisWeek, trend: trendPct(completedThisWeek, completedLastWeek) },
      overdueTasks: { value: overdueTasks, trend: 0 },
      activeCampaigns: { value: activeCampaigns, trend: 0 },
      teamCapacity: { value: avgCapacity, trend: 0 },
      deadlinesAtRisk: { value: deadlinesAtRisk, trend: 0 },
      approvalPending: { value: approvalPending, trend: 0 },
    },
    completionTrend,
    statusBreakdown,
    insights,
  });
}
