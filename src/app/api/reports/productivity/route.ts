import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "week"; // "today" | "week" | "month"
  const userId = searchParams.get("userId");
  const rawDeptId = searchParams.get("departmentId");

  let departmentId: string | null = null;
  if (rawDeptId) {
    const dept = await db.department.findUnique({ where: { id: rawDeptId }, select: { id: true } });
    if (dept) departmentId = dept.id;
  }

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

  let rangeStart: Date;
  if (range === "today") {
    rangeStart = todayStart;
  } else if (range === "month") {
    rangeStart = new Date(now); rangeStart.setDate(rangeStart.getDate() - 30); rangeStart.setHours(0, 0, 0, 0);
  } else {
    rangeStart = new Date(now); rangeStart.setDate(rangeStart.getDate() - 7); rangeStart.setHours(0, 0, 0, 0);
  }

  const users = await db.user.findMany({
    where: {
      isActive: true,
      ...(userId ? { id: userId } : {}),
      ...(departmentId ? { departmentMemberships: { some: { departmentId } } } : {}),
    },
    orderBy: { name: "asc" },
    include: {
      assignedTasks: {
        include: {
          task: {
            select: {
              status: true,
              dueDate: true,
              completedAt: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  const userStats = users.map((u) => {
    const allTasks = u.assignedTasks.map((a) => a.task);
    const completedInRange = allTasks.filter(
      (t) => t.status === "COMPLETED" && t.completedAt && t.completedAt >= rangeStart
    );
    const onTime = completedInRange.filter(
      (t) => !t.dueDate || (t.completedAt && t.dueDate && t.completedAt <= t.dueDate)
    );
    const delayed = completedInRange.filter(
      (t) => t.dueDate && t.completedAt && t.completedAt > t.dueDate
    );
    const activeTasks = allTasks.filter((t) => t.status !== "COMPLETED").length;
    const overdueTasks = allTasks.filter(
      (t) => t.dueDate && t.dueDate < todayStart && t.status !== "COMPLETED"
    ).length;

    // Average completion time in days
    const completionTimes = completedInRange
      .filter((t) => t.completedAt && t.createdAt)
      .map((t) => Math.max(0, Math.round((t.completedAt!.getTime() - t.createdAt.getTime()) / 86400000)));
    const avgCompletionDays = completionTimes.length > 0
      ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
      : 0;

    return {
      id: u.id,
      name: u.name,
      image: u.image,
      marketingRole: u.marketingRole,
      completed: completedInRange.length,
      onTime: onTime.length,
      delayed: delayed.length,
      activeTasks,
      overdueTasks,
      avgCompletionDays,
      completionRate: allTasks.length > 0
        ? Math.round((completedInRange.length / Math.max(allTasks.length, 1)) * 100)
        : 0,
    };
  });

  // Daily completion trend for the range
  const days = range === "today" ? 1 : range === "week" ? 7 : 30;
  const trendMap: Record<string, number> = {};
  users.forEach((u) => {
    u.assignedTasks.forEach((a) => {
      const t = a.task;
      if (t.status === "COMPLETED" && t.completedAt && t.completedAt >= rangeStart) {
        const key = t.completedAt.toISOString().split("T")[0];
        trendMap[key] = (trendMap[key] || 0) + 1;
      }
    });
  });
  const trend = Array.from({ length: days }, (_, i) => {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    return {
      date: days <= 7
        ? d.toLocaleDateString("en-US", { weekday: "short" })
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      completed: trendMap[key] || 0,
    };
  });

  return NextResponse.json({ data: userStats, trend });
}
