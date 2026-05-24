import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const { tasks, endDate, today, campaignName } = await req.json();
  if (!tasks?.length || !endDate) return NextResponse.json({ error: "Tasks and end date required" }, { status: 400 });

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `You are a marketing project manager optimizing a campaign timeline.

Campaign: "${campaignName}"
Today: ${today}
Campaign deadline: ${endDate}
Days available: ${Math.ceil((new Date(endDate).getTime() - new Date(today).getTime()) / 86400000)}

Remaining tasks:
${JSON.stringify(tasks)}

Distribute tasks across the available time to hit the deadline. Consider task priority, estimated hours, and logical order (strategy before execution, content before design review, etc.).

Respond with valid JSON only (no markdown):
{
  "schedule": [
    {
      "taskId": "id",
      "suggestedDueDate": "YYYY-MM-DD",
      "order": 1,
      "reason": "short reason (max 8 words)"
    }
  ],
  "summary": "one sentence overview of the recommended timeline"
}

Only use task IDs from the provided list. Spread work evenly, not all on the last day.`;

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
    console.error("AI timeline-optimizer error:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
