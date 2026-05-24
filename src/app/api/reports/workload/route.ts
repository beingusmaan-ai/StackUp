import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function capacityStatus(pct: number): "healthy" | "busy" | "high" | "overloaded" {
  if (pct <= 50) return "healthy";
  if (pct <= 80) return "busy";
  if (pct <= 100) return "high";
  return "overloaded";
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get("departmentId");

  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7); weekAgo.setHours(0, 0, 0, 0);
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

  const users = await db.user.findMany({
    where: {
      isActive: true,
      ...(departmentId ? { departmentMemberships: { some: { departmentId } } } : {}),
    },
    orderBy: { name: "asc" },
    include: {
      assignedTasks: {
        include: {
          task: { select: { status: true, dueDate: true, completedAt: true, priority: true } },
        },
      },
    },
  });

  const data = users.map((u) => {
    const allTasks = u.assignedTasks.map((a) => a.task);
    const activeTasks = allTasks.filter((t) => t.status !== "COMPLETED");
    const completedThisWeek = allTasks.filter(
      (t) => t.status === "COMPLETED" && t.completedAt && t.completedAt >= weekAgo
    );
    const overdueTasks = allTasks.filter(
      (t) => t.dueDate && t.dueDate < todayStart && t.status !== "COMPLETED"
    );
    const urgentTasks = activeTasks.filter((t) => t.priority === "URGENT" || t.priority === "HIGH");
    const capacityPct = Math.round((activeTasks.length / 10) * 100);

    return {
      id: u.id,
      name: u.name,
      image: u.image,
      marketingRole: u.marketingRole,
      activeTasks: activeTasks.length,
      completedThisWeek: completedThisWeek.length,
      overdueTasks: overdueTasks.length,
      urgentTasks: urgentTasks.length,
      capacityPct,
      status: capacityStatus(capacityPct),
    };
  });

  return NextResponse.json({ data });
}
