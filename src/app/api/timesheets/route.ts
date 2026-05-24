import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId") || session.user.id;
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

  if (session.user.role === "TEAM_MEMBER" && targetUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const [entries, activities, completedTasks, assignedTasks] = await Promise.all([
    db.timeEntry.findMany({
      where: { userId: targetUserId, date: { gte: start, lte: end } },
      include: { task: { select: { id: true, title: true } } },
      orderBy: { date: "asc" },
    }),
    db.taskActivity.findMany({
      where: {
        actorId: targetUserId,
        createdAt: { gte: start, lte: end },
        task: { assignees: { some: { userId: targetUserId } } },
      },
      include: { task: { select: { id: true, title: true, estimatedHours: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.task.findMany({
      where: {
        completedAt: { gte: start, lte: end },
        assignees: { some: { userId: targetUserId } },
        status: "COMPLETED",
      },
      select: { id: true, title: true, completedAt: true, estimatedHours: true },
    }),
    // Active assigned tasks — shown as suggestions on today's date
    db.task.findMany({
      where: {
        assignees: { some: { userId: targetUserId } },
        status: { in: ["ASSIGNED", "IN_PROGRESS", "REVISION_REQUIRED"] },
      },
      select: { id: true, title: true, estimatedHours: true },
    }),
  ]);

  // Build suggestions grouped by day (YYYY-MM-DD)
  const activityByDay: Record<string, { taskId: string; taskTitle: string; estimatedHours: number | null }[]> = {};

  const addSuggestion = (dayKey: string, taskId: string, taskTitle: string, estimatedHours: number | null) => {
    if (!activityByDay[dayKey]) activityByDay[dayKey] = [];
    if (!activityByDay[dayKey].some((a) => a.taskId === taskId)) {
      activityByDay[dayKey].push({ taskId, taskTitle, estimatedHours });
    }
  };

  for (const a of activities) {
    const dayKey = a.createdAt.toISOString().split("T")[0];
    addSuggestion(dayKey, a.task.id, a.task.title, a.task.estimatedHours);
  }

  for (const t of completedTasks) {
    if (!t.completedAt) continue;
    const dayKey = t.completedAt.toISOString().split("T")[0];
    addSuggestion(dayKey, t.id, t.title, t.estimatedHours);
  }

  // Active assigned tasks appear as suggestions on every workday of the month
  if (assignedTasks.length > 0) {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay(); // 0=Sun, 6=Sat
      if (dow === 0 || dow === 6) continue; // skip weekends
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      // Only suggest up to and including today
      if (dayKey > todayKey) break;
      for (const t of assignedTasks) {
        addSuggestion(dayKey, t.id, t.title, t.estimatedHours);
      }
    }
  }

  return NextResponse.json({ data: entries, activityByDay });
}

const createSchema = z.object({
  userId: z.string().min(1),
  taskId: z.string().optional().nullable(),
  date: z.string(),
  hours: z.number().min(0.25).max(24),
  note: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  if (session.user.role === "TEAM_MEMBER" && parsed.data.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const entry = await db.timeEntry.create({
      data: {
        userId: parsed.data.userId,
        taskId: parsed.data.taskId || null,
        date: new Date(parsed.data.date),
        hours: parsed.data.hours,
        note: parsed.data.note || null,
      },
      include: { task: { select: { id: true, title: true } } },
    });

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (err) {
    console.error("TimeEntry create failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
