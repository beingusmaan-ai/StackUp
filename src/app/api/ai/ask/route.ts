import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Groq from "groq-sdk";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question, history, teamId, model = "groq/llama-3.3-70b-versatile" } = await req.json();
  if (!question?.trim()) return NextResponse.json({ error: "Question required" }, { status: 400 });

  // Validate that the requested provider's key is configured
  const providerKey = model.startsWith("openai/") ? process.env.OPENAI_API_KEY
    : model.startsWith("anthropic/") ? process.env.ANTHROPIC_API_KEY
    : model.startsWith("google/") ? process.env.GOOGLE_GEMINI_API_KEY
    : process.env.GROQ_API_KEY;
  if (!providerKey) {
    return NextResponse.json({ error: `API key not configured for this model. Add the required key to your environment.` }, { status: 503 });
  }

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

    const systemContent = `You are StackUp Mind, an intelligent assistant integrated with the StackUp project management portal. You have access to real-time data from the portal. Answer questions using the actual data provided below. Be specific, concise, and data-driven — never give generic answers.

PORTAL DATA:
${context}`;

    const chatMessages = [
      ...(history ?? []),
      { role: "user" as const, content: question },
    ];

    let answer = "";

    if (model.startsWith("openai/")) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const modelId = model.replace("openai/", "");
      const completion = await openai.chat.completions.create({
        model: modelId,
        max_tokens: 1024,
        messages: [{ role: "system", content: systemContent }, ...chatMessages],
      });
      answer = completion.choices[0]?.message?.content ?? "";

    } else if (model.startsWith("anthropic/")) {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const modelId = model.replace("anthropic/", "");
      const response = await anthropic.messages.create({
        model: modelId,
        max_tokens: 1024,
        system: systemContent,
        messages: chatMessages.map((m) => ({ role: m.role, content: m.content })),
      });
      answer = response.content[0]?.type === "text" ? response.content[0].text : "";

    } else if (model.startsWith("google/")) {
      const geminiModel = model.replace("google/", "");
      // v1 doesn't support systemInstruction — inject context as a leading user/model exchange
      const geminiMessages = [
        { role: "user",  parts: [{ text: systemContent }] },
        { role: "model", parts: [{ text: "Understood. I have the workspace data and will answer based on it." }] },
        ...chatMessages.map((m) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        })),
      ];
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${geminiModel}:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: geminiMessages,
            generationConfig: { maxOutputTokens: 2048 },
          }),
        }
      );
      const geminiData = await geminiRes.json();
      if (!geminiRes.ok || geminiData.error) {
        const msg = geminiData.error?.message ?? `Gemini API error (${geminiRes.status})`;
        console.error("[Gemini error]", geminiData.error);
        return NextResponse.json({ error: msg }, { status: 502 });
      }
      answer = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    } else {
      // Default: Groq
      const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const modelId = model.replace("groq/", "");
      const completion = await groqClient.chat.completions.create({
        model: modelId,
        max_tokens: 1024,
        messages: [{ role: "system", content: systemContent }, ...chatMessages],
      });
      answer = completion.choices[0]?.message?.content ?? "";
    }

    return NextResponse.json({ answer: answer || "I couldn't generate a response." });
  } catch (err) {
    console.error("[POST /api/ai/ask]", err);
    return NextResponse.json({ error: "AI request failed. Please try again." }, { status: 500 });
  }
}
