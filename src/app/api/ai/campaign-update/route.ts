import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY)
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const { campaignId } = await req.json();
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: {
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      tasks: {
        select: {
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          assignees: { select: { user: { select: { name: true } } } },
        },
      },
    },
  });

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const taskLines = campaign.tasks.map((t) => {
    const assignees = t.assignees.map((a) => a.user.name).join(", ");
    const due = t.dueDate ? ` — due ${new Date(t.dueDate).toLocaleDateString()}` : "";
    return `- [${t.status.replace(/_/g, " ")}] ${t.title}${assignees ? ` (${assignees})` : ""}${due}`;
  });

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const res = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 800,
    messages: [
      {
        role: "system",
        content:
          "You generate concise project status updates for managers. Be professional and direct. No preambles.",
      },
      {
        role: "user",
        content: `Generate a status update for campaign: "${campaign.name}"
Campaign Status: ${campaign.status}
${campaign.endDate ? `Deadline: ${new Date(campaign.endDate).toLocaleDateString()}` : ""}

Tasks:
${taskLines.join("\n")}

Write a status update with these sections using these exact headers:
✅ Completed
🔄 In Progress
⚠️ Blocked / Waiting
📋 Next Steps

Each section: 2–4 bullet points max. End with a single-line overall assessment.`,
      },
    ],
  });

  const update = res.choices[0]?.message?.content ?? "";
  return NextResponse.json({ update });
}
