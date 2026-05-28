import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teamId } = await req.json().catch(() => ({}));

  const now = new Date();
  const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let memberIds: string[] | undefined;
  if (teamId) {
    const m = await db.departmentMember.findMany({ where: { departmentId: teamId }, select: { userId: true } });
    memberIds = m.map((x) => x.userId);
  }

  const scope = memberIds ? { assignees: { some: { userId: { in: memberIds } } } } : {};
  const fmt = (d: Date | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No date";

  const [overdue, critical, upcoming] = await Promise.all([
    db.task.findMany({
      where: { ...scope, dueDate: { lt: now }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      select: { title: true, dueDate: true, priority: true, status: true, assignees: { select: { user: { select: { name: true } } } }, campaign: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
    db.task.findMany({
      where: { ...scope, dueDate: { gte: now, lte: threeDays }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      select: { title: true, dueDate: true, priority: true, status: true, assignees: { select: { user: { select: { name: true } } } }, campaign: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
    db.task.findMany({
      where: { ...scope, dueDate: { gt: threeDays, lte: sevenDays }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      select: { title: true, dueDate: true, priority: true, status: true, assignees: { select: { user: { select: { name: true } } } }, campaign: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
  ]);

  const fmtTask = (t: typeof overdue[0]) =>
    `- "${t.title}" | Due: ${fmt(t.dueDate)} | Priority: ${t.priority} | Assigned: ${t.assignees.map((a) => a.user.name).join(", ") || "Unassigned"} | Project: ${t.campaign?.name ?? "None"}`;

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  const res = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 900,
    messages: [
      { role: "system", content: "You are a deadline management assistant. Analyze task deadlines and give prioritized, actionable recommendations. Be direct and specific." },
      { role: "user", content: `Generate a deadline risk report for ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.

🔴 OVERDUE (${overdue.length} tasks):
${overdue.length === 0 ? "None" : overdue.map(fmtTask).join("\n")}

🟠 CRITICAL — Due in 3 days (${critical.length} tasks):
${critical.length === 0 ? "None" : critical.map(fmtTask).join("\n")}

🟡 UPCOMING — Due this week (${upcoming.length} tasks):
${upcoming.length === 0 ? "None" : upcoming.map(fmtTask).join("\n")}

Provide:
1. Top 3 immediate actions needed
2. Risk assessment (which items will likely slip)
3. Reassignment recommendations if workload is uneven
Keep it actionable and concise.` },
    ],
  });

  return NextResponse.json({ summary: res.choices[0]?.message?.content ?? "" });
}
