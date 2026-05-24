import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  const [
    totalTasks,
    tasksDueToday,
    overdueTasks,
    completedThisWeek,
    activeCampaigns,
    tasksByStatus,
    teamMembers,
    recentActivity,
    campaigns,
  ] = await Promise.all([
    db.task.count({ where: { status: { not: "COMPLETED" } } }),
    db.task.count({
      where: { dueDate: { gte: todayStart, lte: todayEnd }, status: { not: "COMPLETED" } },
    }),
    db.task.count({
      where: { dueDate: { lt: todayStart }, status: { notIn: ["COMPLETED", "BLOCKED"] } },
    }),
    db.task.count({
      where: { completedAt: { gte: weekStart, lte: weekEnd }, status: "COMPLETED" },
    }),
    db.campaign.count({ where: { status: "ACTIVE" } }),
    db.task.groupBy({ by: ["status"], _count: { status: true } }),
    db.user.findMany({
      where: { isActive: true },
      include: {
        assignedTasks: {
          include: {
            task: { select: { status: true, dueDate: true } },
          },
        },
      },
      take: 10,
    }),
    db.taskActivity.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        actor: { select: { id: true, name: true, image: true } },
        task: { select: { id: true, title: true } },
      },
    }),
    db.campaign.findMany({
      where: { status: { in: ["ACTIVE", "DRAFT"] } },
      include: {
        owner: { select: { id: true, name: true } },
        tasks: { select: { status: true } },
      },
      take: 6,
    }),
  ]);

  const teamPerformance = teamMembers.map((u) => {
    const assigned = u.assignedTasks.length;
    const completed = u.assignedTasks.filter((a) => a.task.status === "COMPLETED").length;
    const delayed = u.assignedTasks.filter(
      (a) => a.task.dueDate && a.task.dueDate < now && a.task.status !== "COMPLETED"
    ).length;
    return {
      user: { id: u.id, name: u.name, image: u.image, marketingRole: u.marketingRole },
      assigned,
      completed,
      delayed,
      completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
    };
  });

  const campaignProgress = campaigns.map((c) => {
    const total = c.tasks.length;
    const done = c.tasks.filter((t) => t.status === "COMPLETED").length;
    return {
      campaign: { id: c.id, name: c.name, endDate: c.endDate, owner: c.owner, status: c.status },
      totalTasks: total,
      completedTasks: done,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  return NextResponse.json({
    totalTasks,
    tasksDueToday,
    overdueTasks,
    completedThisWeek,
    activeCampaigns,
    tasksByStatus: tasksByStatus.map((s) => ({ status: s.status, count: s._count.status })),
    teamPerformance,
    recentActivity,
    campaignProgress,
  });
}
