import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const { name, status, startDate, endDate, today, totalTasks, completedTasks, blockedTasks, overdueTasks, progress, daysRemaining, totalDays } = await req.json();

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `You are a marketing project analyst. Assess the health of this campaign.

Campaign: "${name}"
Status: ${status}
Timeline: ${startDate} → ${endDate} (${daysRemaining} days remaining of ${totalDays} total)
Today: ${today}
Progress: ${progress}% (${completedTasks}/${totalTasks} tasks completed)
Blocked tasks: ${blockedTasks}
Overdue tasks: ${overdueTasks}

Expected progress at this point: ${Math.round(((totalDays - daysRemaining) / totalDays) * 100)}%

Respond with valid JSON only (no markdown):
{
  "score": 75,
  "level": "good",
  "diagnosis": "one sentence summary of campaign health status",
  "risks": ["specific risk 1", "specific risk 2"]
}

Score guide: 90-100 excellent, 70-89 good, 50-69 at_risk, 0-49 critical
Level values: "excellent" | "good" | "at_risk" | "critical"
Risks: only include real risks based on the data, max 3, empty array if none.`;

  try {
    const message = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = message.choices[0]?.message?.content?.trim() ?? "";
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({ data: parsed });
  } catch (err) {
    console.error("AI campaign-health error:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
