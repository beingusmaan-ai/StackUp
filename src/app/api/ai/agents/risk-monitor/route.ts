import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teamId } = await req.json().catch(() => ({}));

  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No date";

  let memberIds: string[] | undefined;
  if (teamId) {
    const m = await db.departmentMember.findMany({ where: { departmentId: teamId }, select: { userId: true } });
    memberIds = m.map((x) => x.userId);
  }

  const scope = memberIds ? { assignees: { some: { userId: { in: memberIds } } } } : {};

  const [blocked, overdue, unassigned, campaigns] = await Promise.all([
    db.task.findMany({
      where: { ...scope, status: "BLOCKED" },
      select: { title: true, priority: true, dueDate: true, assignees: { select: { user: { select: { name: true } } } }, campaign: { select: { name: true } } },
      take: 20,
    }),
    db.task.findMany({
      where: { ...scope, dueDate: { lt: now }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      select: { title: true, priority: true, dueDate: true, assignees: { select: { user: { select: { name: true } } } }, campaign: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
    db.task.findMany({
      where: { assignees: { none: {} }, status: { notIn: ["COMPLETED", "CANCELLED"] }, dueDate: { lte: sevenDays }, ...(memberIds ? {} : {}) },
      select: { title: true, priority: true, dueDate: true, campaign: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 15,
    }),
    db.campaign.findMany({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] }, endDate: { lte: sevenDays }, ...(memberIds ? { OR: [{ ownerId: { in: memberIds } }, { departmentId: teamId ?? undefined }] } : {}) },
      select: { name: true, status: true, endDate: true, _count: { select: { tasks: true } } },
      orderBy: { endDate: "asc" },
      take: 10,
    }),
  ]);

  const fmtTask = (t: { title: string; priority: string; dueDate: Date | null; campaign: { name: string } | null; assignees?: { user: { name: string } }[] }) =>
    `- "${t.title}" | Priority: ${t.priority} | Due: ${fmt(t.dueDate)} | Project: ${t.campaign?.name ?? "None"}${t.assignees ? ` | Assigned: ${t.assignees.map((a) => a.user.name).join(", ") || "Unassigned"}` : ""}`;

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  const res = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 900,
    messages: [
      { role: "system", content: "You are a project risk analyst. Identify risks, rate their severity (Critical/High/Medium), and give concrete mitigation steps. Focus on actionable insights." },
      { role: "user", content: `Run a risk assessment as of ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.

🚫 BLOCKED TASKS (${blocked.length}):
${blocked.length === 0 ? "None" : blocked.map(fmtTask).join("\n")}

🔴 OVERDUE TASKS (${overdue.length}):
${overdue.length === 0 ? "None" : overdue.map(fmtTask).join("\n")}

⚠️ UNASSIGNED TASKS DUE SOON (${unassigned.length}):
${unassigned.length === 0 ? "None" : unassigned.map(fmtTask).join("\n")}

📅 PROJECTS ENDING THIS WEEK (${campaigns.length}):
${campaigns.length === 0 ? "None" : campaigns.map((c) => `- "${c.name}" | Status: ${c.status} | End: ${fmt(c.endDate)} | Total tasks: ${c._count.tasks}`).join("\n")}

Provide:
1. Risk Registry — list each risk with severity rating (Critical/High/Medium)
2. Top 3 mitigation actions to take today
3. Projects at highest risk of missing deadline` },
    ],
  });

  return NextResponse.json({ summary: res.choices[0]?.message?.content ?? "" });
}
