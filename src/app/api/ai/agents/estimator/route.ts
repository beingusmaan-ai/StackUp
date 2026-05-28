import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teamId, campaignId } = await req.json().catch(() => ({}));

  const now = new Date();

  let memberIds: string[] | undefined;
  if (teamId) {
    const m = await db.departmentMember.findMany({ where: { departmentId: teamId }, select: { userId: true } });
    memberIds = m.map((x) => x.userId);
  }

  const scope = memberIds ? { assignees: { some: { userId: { in: memberIds } } } } : {};

  const [unestimated, estimated, completedWithTime] = await Promise.all([
    db.task.findMany({
      where: { ...scope, estimatedHours: null, status: { notIn: ["COMPLETED", "CANCELLED"] }, ...(campaignId ? { campaignId } : {}) },
      select: { title: true, priority: true, status: true, campaign: { select: { name: true } }, assignees: { select: { user: { select: { name: true } } } } },
      take: 30,
    }),
    db.task.findMany({
      where: { ...scope, estimatedHours: { not: null }, status: { notIn: ["COMPLETED", "CANCELLED"] }, ...(campaignId ? { campaignId } : {}) },
      select: { title: true, priority: true, estimatedHours: true, status: true, campaign: { select: { name: true } } },
      take: 20,
    }),
    db.task.findMany({
      where: { ...scope, estimatedHours: { not: null }, status: "COMPLETED" },
      select: { title: true, priority: true, estimatedHours: true, campaign: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  const accuracy = completedWithTime.length > 0
    ? completedWithTime.map((t) =>
        `- "${t.title}": estimated ${t.estimatedHours}h | Priority: ${t.priority} | Project: ${t.campaign?.name ?? "None"}`
      ).join("\n")
    : "No completed tasks with time tracking data.";

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  const res = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1000,
    messages: [
      { role: "system", content: "You are a task estimation expert. Analyze historical accuracy and provide smart estimates for untracked tasks. Use the team's past performance to calibrate estimates." },
      { role: "user", content: `Run a task estimation analysis as of ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.

HISTORICAL ACCURACY (completed tasks with time data):
${accuracy}

TASKS WITH ESTIMATES (${estimated.length}):
${estimated.length === 0 ? "None" : estimated.map((t) => `- "${t.title}" | ${t.estimatedHours}h | Priority: ${t.priority} | ${t.campaign?.name ?? "No project"}`).join("\n")}

TASKS WITHOUT ESTIMATES (${unestimated.length}):
${unestimated.length === 0 ? "None" : unestimated.map((t) => `- "${t.title}" | Priority: ${t.priority} | Status: ${t.status} | Project: ${t.campaign?.name ?? "None"} | Assigned: ${t.assignees.map((a) => a.user.name).join(", ") || "Unassigned"}`).join("\n")}

Provide:
1. Estimation Accuracy Summary — is the team over or under-estimating?
2. Suggested hour estimates for each unestimated task (with brief rationale)
3. Total estimated hours for the unestimated backlog
4. Recommendations for improving estimation accuracy going forward` },
    ],
  });

  return NextResponse.json({ summary: res.choices[0]?.message?.content ?? "" });
}
