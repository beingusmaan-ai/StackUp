import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teamId } = await req.json().catch(() => ({}));

  const now = new Date();

  let memberIds: string[] | undefined;
  if (teamId) {
    const m = await db.departmentMember.findMany({ where: { departmentId: teamId }, select: { userId: true } });
    memberIds = m.map((x) => x.userId);
  }

  const users = await db.user.findMany({
    where: { isActive: true, ...(memberIds ? { id: { in: memberIds } } : {}) },
    select: {
      id: true,
      name: true,
      marketingRole: true,
      assignedTasks: {
        select: {
          task: {
            select: {
              title: true,
              status: true,
              priority: true,
              dueDate: true,
              estimatedHours: true,
            },
          },
        },
      },
    },
    take: 30,
  });

  const stats = users.map((u) => {
    const active = u.assignedTasks.filter((a) => !["COMPLETED", "CANCELLED"].includes(a.task.status));
    const overdue = active.filter((a) => a.task.dueDate && new Date(a.task.dueDate) < now);
    const blocked = active.filter((a) => a.task.status === "BLOCKED");
    const hours = active.reduce((s, a) => s + (a.task.estimatedHours ?? 0), 0);
    const highPri = active.filter((a) => ["URGENT", "HIGH"].includes(a.task.priority)).length;
    return {
      name: u.name,
      role: u.marketingRole ?? "Team Member",
      active: active.length,
      overdue: overdue.length,
      blocked: blocked.length,
      hours,
      highPri,
    };
  });

  const avgActive = stats.length > 0 ? (stats.reduce((s, u) => s + u.active, 0) / stats.length).toFixed(1) : "0";
  const avgHours = stats.length > 0 ? (stats.reduce((s, u) => s + u.hours, 0) / stats.length).toFixed(1) : "0";

  const teamSection = stats.map((u) =>
    `- ${u.name} (${u.role}): ${u.active} active tasks | ${u.hours}h estimated | ${u.highPri} high-priority | ${u.overdue} overdue | ${u.blocked} blocked`
  ).join("\n");

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  const res = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 900,
    messages: [
      { role: "system", content: "You are a workload balancing specialist. Analyze team workload distribution and provide specific rebalancing recommendations. Be direct about who is overloaded and who has capacity." },
      { role: "user", content: `Analyze team workload as of ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.

TEAM AVERAGES: ${avgActive} active tasks/person | ${avgHours}h/person

INDIVIDUAL WORKLOAD (${stats.length} members):
${teamSection || "No members found."}

Provide:
1. Workload Health Score (0–100) with one-line rationale
2. Overloaded members — who needs task relief and why
3. Under-utilized members — who has capacity to take on more
4. Specific rebalancing recommendations (move task X from A to B)
5. Any burnout warning signs to watch` },
    ],
  });

  return NextResponse.json({ summary: res.choices[0]?.message?.content ?? "" });
}
