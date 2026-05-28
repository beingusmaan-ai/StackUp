import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teamId } = await req.json().catch(() => ({}));

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  let memberIds: string[] | undefined;
  if (teamId) {
    const m = await db.departmentMember.findMany({ where: { departmentId: teamId }, select: { userId: true } });
    memberIds = m.map((x) => x.userId);
  }

  const scope = memberIds ? { assignees: { some: { userId: { in: memberIds } } } } : {};

  const [completed, inProgress, blocked] = await Promise.all([
    db.task.findMany({
      where: { ...scope, status: "COMPLETED", updatedAt: { gte: yesterday } },
      select: { title: true, assignees: { select: { user: { select: { name: true } } } }, campaign: { select: { name: true } } },
      take: 30,
    }),
    db.task.findMany({
      where: { ...scope, status: "IN_PROGRESS" },
      select: { title: true, dueDate: true, assignees: { select: { user: { select: { name: true } } } }, campaign: { select: { name: true } } },
      take: 30,
    }),
    db.task.findMany({
      where: { ...scope, status: "BLOCKED" },
      select: { title: true, assignees: { select: { user: { select: { name: true } } } }, campaign: { select: { name: true } } },
      take: 20,
    }),
  ]);

  const fmt = (tasks: typeof completed) =>
    tasks.length === 0 ? "None" : tasks.map((t) =>
      `- "${t.title}"${t.assignees.length ? ` (${t.assignees.map((a) => a.user.name).join(", ")})` : ""}${t.campaign ? ` — ${t.campaign.name}` : ""}`
    ).join("\n");

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  const res = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 800,
    messages: [
      { role: "system", content: "You are a standup assistant. Generate a concise, professional daily standup report. No preambles." },
      { role: "user", content: `Generate a daily standup report for ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.

✅ COMPLETED (last 24h):
${fmt(completed)}

🔄 IN PROGRESS:
${fmt(inProgress)}

🚫 BLOCKED:
${fmt(blocked)}

Format with clear sections. Be concise. End with a one-line team health note.` },
    ],
  });

  return NextResponse.json({ summary: res.choices[0]?.message?.content ?? "" });
}
