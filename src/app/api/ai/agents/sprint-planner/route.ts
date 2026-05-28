import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teamId } = await req.json().catch(() => ({}));

  const now = new Date();
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  let memberIds: string[] | undefined;
  if (teamId) {
    const m = await db.departmentMember.findMany({ where: { departmentId: teamId }, select: { userId: true } });
    memberIds = m.map((x) => x.userId);
  }

  const scope = memberIds ? { assignees: { some: { userId: { in: memberIds } } } } : {};
  const fmt = (d: Date | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No date";

  const [backlog, inProgress, members, campaigns] = await Promise.all([
    db.task.findMany({
      where: { ...scope, status: { in: ["TODO", "NOT_STARTED"] }, dueDate: { lte: twoWeeks } },
      select: { title: true, priority: true, dueDate: true, estimatedHours: true, assignees: { select: { user: { select: { name: true } } } }, campaign: { select: { name: true } } },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
      take: 40,
    }),
    db.task.findMany({
      where: { ...scope, status: "IN_PROGRESS" },
      select: { title: true, priority: true, dueDate: true, estimatedHours: true, assignees: { select: { user: { select: { name: true } } } }, campaign: { select: { name: true } } },
      take: 20,
    }),
    db.user.findMany({
      where: { isActive: true, ...(memberIds ? { id: { in: memberIds } } : {}) },
      select: {
        name: true,
        marketingRole: true,
        assignedTasks: {
          where: { task: { status: { notIn: ["COMPLETED", "CANCELLED"] } } },
          select: { task: { select: { estimatedHours: true } } },
        },
      },
      take: 20,
    }),
    db.campaign.findMany({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] }, ...(memberIds ? { OR: [{ ownerId: { in: memberIds } }, { departmentId: teamId ?? undefined }] } : {}) },
      select: { name: true, endDate: true, status: true },
      orderBy: { endDate: "asc" },
      take: 10,
    }),
  ]);

  const memberCapacity = members.map((u) => {
    const load = u.assignedTasks.reduce((s, a) => s + (a.task.estimatedHours ?? 0), 0);
    return `- ${u.name}${u.marketingRole ? ` (${u.marketingRole})` : ""}: ${load}h already scheduled`;
  }).join("\n");

  const fmtTask = (t: typeof backlog[0]) =>
    `- "${t.title}" | Priority: ${t.priority} | Est: ${t.estimatedHours ?? "?"}h | Due: ${fmt(t.dueDate)} | Assigned: ${t.assignees.map((a) => a.user.name).join(", ") || "Unassigned"} | ${t.campaign?.name ?? "No project"}`;

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  const res = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1000,
    messages: [
      { role: "system", content: "You are a sprint planning assistant. Create a realistic 2-week sprint plan based on team capacity, priorities, and deadlines. Be specific with task assignments." },
      { role: "user", content: `Create a 2-week sprint plan starting ${now.toLocaleDateString("en-US", { month: "long", day: "numeric" })}.

TEAM CAPACITY (current scheduled hours):
${memberCapacity || "No members found."}

ACTIVE PROJECTS:
${campaigns.map((c) => `- "${c.name}" | Status: ${c.status} | Deadline: ${fmt(c.endDate)}`).join("\n") || "None"}

CURRENTLY IN PROGRESS (${inProgress.length}):
${inProgress.length === 0 ? "None" : inProgress.map(fmtTask).join("\n")}

BACKLOG — due in 2 weeks (${backlog.length} tasks):
${backlog.length === 0 ? "None" : backlog.map(fmtTask).join("\n")}

Produce:
1. Sprint Goal (one sentence)
2. Recommended sprint tasks with owner assignments
3. Tasks to defer to next sprint with reason
4. Capacity warnings if any member is over-allocated` },
    ],
  });

  return NextResponse.json({ summary: res.choices[0]?.message?.content ?? "" });
}
