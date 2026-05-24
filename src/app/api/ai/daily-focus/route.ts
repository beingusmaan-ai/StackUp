import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const { tasks, today } = await req.json();
  if (!tasks?.length) return NextResponse.json({ data: { focus: [] } });

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `You are a productivity coach for a marketing team. Pick the 3 most important tasks to focus on today.

Today: ${today}
Active tasks: ${JSON.stringify(tasks)}

Priority order: overdue > URGENT priority > due today > HIGH priority > due this week.
Exclude COMPLETED tasks.

Respond with valid JSON only (no markdown):
{
  "focus": [
    { "taskId": "id", "reason": "7 words max explaining why today" }
  ]
}

Return exactly 3 taskIds (or fewer if less than 3 active tasks). Only use IDs from the list above.`;

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
    console.error("AI daily-focus error:", err);
    return NextResponse.json({ error: "AI focus failed" }, { status: 500 });
  }
}
