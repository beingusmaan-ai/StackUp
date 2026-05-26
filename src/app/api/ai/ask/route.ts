import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI not configured — add GROQ_API_KEY to .env" }, { status: 503 });
  }

  const { question, history, teamId } = await req.json();
  if (!question?.trim()) return NextResponse.json({ error: "Question required" }, { status: 400 });

  try {
    // Build member ID filter for team scoping
    let memberIdFilter: string[] | undefined;
    if (teamId) {
      const memberships = await db.departmentMember.findMany({
        where: { departmentId: teamId },
        select: { userId: true },
      });
      memberIdFilter = memberships.map((m) => m.userId);
    }

    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Fetch overdue tasks
    const overdueTasks = await db.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        ...(memberIdFilter && {
          assignees: { some: { userId: { in: memberIdFilter } } },
        }),
      },
      select: {
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assignees: { select: { user: { select: { name: true } } } },
        campaign: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 50,
    });

    // Fetch tasks due this week
    const upcomingTasks = await db.task.findMany({
      where: {
        dueDate: { gte: now, lte: weekFromNow },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        ...(memberIdFilter && {
          assignees: { some: { userId: { in: memberIdFilter } } },
        }),
      },
      select: {
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assignees: { select: { user: { select: { name: true } } } },
        campaign: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 30,
    });

    // Fetch active campaigns/projects
    const campaigns = await db.campaign.findMany({
      where: {
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        ...(memberIdFilter && {
          OR: [
            { ownerId: { in: memberIdFilter } },
            { departmentId: teamId ?? undefined },
          ],
        }),
      },
      select: {
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        _count: { select: { tasks: true } },
      },
      orderBy: { startDate: "desc" },
      take: 20,
    });

    // Fetch team members with task stats
    const users = await db.user.findMany({
      where: {
        isActive: true,
        ...(memberIdFilter ? { id: { in: memberIdFilter } } : {}),
      },
      select: {
        name: true,
        role: true,
        marketingRole: true,
        assignedTasks: {
          select: { task: { select: { status: true, dueDate: true } } },
        },
      },
      orderBy: { name: "asc" },
      take: 30,
    });

    const userStats = users.map((u) => {
      const assigned = u.assignedTasks.length;
      const completed = u.assignedTasks.filter((a) => a.task.status === "COMPLETED").length;
      const overdue = u.assignedTasks.filter(
        (a) => a.task.dueDate && new Date(a.task.dueDate) < now && a.task.status !== "COMPLETED"
      ).length;
      const rate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
      return { name: u.name, role: u.role, jobTitle: u.marketingRole, assigned, completed, overdue, rate };
    });

    // Format context
    const fmt = (d: Date | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No date";

    const overdueSection = overdueTasks.length === 0
      ? "No overdue tasks."
      : overdueTasks.map((t) =>
          `- "${t.title}" | Status: ${t.status} | Priority: ${t.priority} | Project: ${t.campaign?.name ?? "None"} | Due: ${fmt(t.dueDate)} | Assigned: ${t.assignees.map((a) => a.user.name).join(", ") || "Unassigned"}`
        ).join("\n");

    const upcomingSection = upcomingTasks.length === 0
      ? "No tasks due this week."
      : upcomingTasks.map((t) =>
          `- "${t.title}" | Status: ${t.status} | Priority: ${t.priority} | Project: ${t.campaign?.name ?? "None"} | Due: ${fmt(t.dueDate)} | Assigned: ${t.assignees.map((a) => a.user.name).join(", ") || "Unassigned"}`
        ).join("\n");

    const campaignsSection = campaigns.length === 0
      ? "No active projects."
      : campaigns.map((c) =>
          `- "${c.name}" | Status: ${c.status} | Tasks: ${c._count.tasks} | ${fmt(c.startDate)} → ${fmt(c.endDate)}`
        ).join("\n");

    const teamSection = userStats.length === 0
      ? "No team members found."
      : userStats.map((u) =>
          `- ${u.name} | ${u.role}${u.jobTitle ? ` (${u.jobTitle})` : ""} | Assigned: ${u.assigned} | Completed: ${u.completed} | Overdue: ${u.overdue} | Rate: ${u.rate}%`
        ).join("\n");

    const context = `
TODAY: ${fmt(now)}
ACTIVE TEAM FILTER: ${teamId ? "Yes (scoped to selected team)" : "All teams (no filter)"}

OVERDUE TASKS (${overdueTasks.length} total):
${overdueSection}

TASKS DUE THIS WEEK (${upcomingTasks.length} total):
${upcomingSection}

ACTIVE PROJECTS (${campaigns.length} total):
${campaignsSection}

TEAM MEMBERS (${userStats.length} total):
${teamSection}
`.trim();

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const messages = [
      {
        role: "system" as const,
        content: `You are StackUp AI, an intelligent assistant integrated with the StackUp project management portal. You have access to real-time data from the portal. Answer questions using the actual data provided below. Be specific, concise, and data-driven — never give generic answers.

PORTAL DATA:
${context}`,
      },
      ...(history ?? []),
      { role: "user" as const, content: question },
    ];

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 1024,
    });

    const answer = completion.choices[0]?.message?.content ?? "I couldn't generate a response.";
    return NextResponse.json({ answer });
  } catch (err) {
    console.error("[POST /api/ai/ask]", err);
    return NextResponse.json({ error: "AI request failed. Please try again." }, { status: 500 });
  }
}
