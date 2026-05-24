import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const { campaign, tasks, today } = await req.json();
  if (!campaign) return NextResponse.json({ error: "Campaign data required" }, { status: 400 });

  const totalTasks = tasks.length;
  const completed = tasks.filter((t: { status: string }) => t.status === "COMPLETED").length;
  const totalEstHours = tasks.reduce((s: number, t: { estimatedHours?: number }) => s + (t.estimatedHours || 0), 0);

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `You are a marketing analyst writing a campaign wrap-up report.

Campaign: "${campaign.name}"
Duration: ${campaign.startDate} → ${campaign.endDate}
Budget: ${campaign.budget ? `$${campaign.budget}` : "Not set"}
Goals: ${campaign.goals || "Not specified"}
Today: ${today}

Execution summary:
- Total tasks: ${totalTasks}
- Completed: ${completed} (${Math.round((completed / totalTasks) * 100)}%)
- Total estimated hours: ${totalEstHours}h
- Tasks: ${JSON.stringify(tasks.map((t: { title: string; status: string; estimatedHours?: number }) => ({ title: t.title, status: t.status, estimatedHours: t.estimatedHours })))}

Respond with valid JSON only (no markdown):
{
  "executiveSummary": "2-3 sentence executive summary",
  "delivered": ["deliverable 1", "deliverable 2", "deliverable 3", "deliverable 4"],
  "timelineAnalysis": "one sentence on whether campaign was on time, early, or late",
  "completionRate": "X% of tasks completed",
  "highlights": ["highlight 1", "highlight 2", "highlight 3"],
  "improvements": ["improvement suggestion 1", "improvement suggestion 2", "improvement suggestion 3"]
}`;

  try {
    const message = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = message.choices[0]?.message?.content?.trim() ?? "";
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({ data: parsed });
  } catch (err) {
    console.error("AI campaign-wrapup error:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
