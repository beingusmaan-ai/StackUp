import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function riskLevel(
  progress: number,
  daysRemaining: number | null,
  blockedTasks: number
): "safe" | "watch" | "risk" | "critical" {
  if (daysRemaining !== null && daysRemaining < 0) return "critical";
  if (daysRemaining !== null && daysRemaining <= 3 && progress < 90) return "critical";
  if (blockedTasks >= 5) return "critical";
  if (daysRemaining !== null && daysRemaining <= 7 && progress < 70) return "risk";
  if (blockedTasks >= 3) return "risk";
  if (daysRemaining !== null && daysRemaining <= 14 && progress < 50) return "watch";
  return "safe";
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get("departmentId");

  const now = new Date();

  const campaigns = await db.campaign.findMany({
    where: {
      status: "ACTIVE",
      ...(departmentId ? { departmentId } : {}),
    },
    orderBy: { endDate: "asc" },
    include: {
      owner: { select: { id: true, name: true } },
      tasks: { select: { status: true } },
      department: { select: { name: true, color: true } },
    },
  });

  const data = campaigns.map((c) => {
    const total = c.tasks.length;
    const done = c.tasks.filter((t) => t.status === "COMPLETED").length;
    const blocked = c.tasks.filter((t) => t.status === "BLOCKED").length;
    const inReview = c.tasks.filter((t) => t.status === "WAITING_APPROVAL").length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    const daysRemaining = c.endDate
      ? Math.ceil((c.endDate.getTime() - now.getTime()) / 86400000)
      : null;

    return {
      id: c.id,
      name: c.name,
      department: c.department ? { name: c.department.name, color: c.department.color } : null,
      progress,
      totalTasks: total,
      completedTasks: done,
      blockedTasks: blocked,
      inReviewTasks: inReview,
      pendingTasks: total - done,
      deadline: c.endDate?.toISOString() ?? null,
      daysRemaining,
      owner: c.owner.name,
      riskLevel: riskLevel(progress, daysRemaining, blocked),
    };
  });

  return NextResponse.json({ data });
}
