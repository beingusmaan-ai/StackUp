import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }

  const { campaigns, today } = await req.json();
  if (!campaigns?.length) {
    return NextResponse.json({ error: "No campaign data" }, { status: 400 });
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `Predict the completion date for each marketing campaign based on current progress.

Today: ${today}
Campaigns: ${JSON.stringify(campaigns)}

Fields per campaign: id, name, progress (%), totalTasks, completedTasks, pendingTasks, blockedTasks, daysRemaining (null if no deadline), riskLevel.

For each campaign estimate:
- Remaining work: totalTasks - completedTasks
- If no daysRemaining, mark as "no_deadline"
- Otherwise predict if it will finish early, on time, or late — using progress vs time consumed, blocked tasks as a drag factor

Return ONLY a valid JSON object:
{
  "predictions": [
    {
      "id": "campaign id",
      "name": "campaign name",
      "status": "on_track" or "at_risk" or "will_miss" or "no_deadline",
      "predictedOffsetDays": number (positive = days late, negative = days early, 0 = on time),
      "confidence": "high" or "medium" or "low",
      "insight": "one sentence explaining the prediction using actual numbers"
    }
  ],
  "summary": "one sentence about the portfolio overall"
}

Confidence guide:
- high: clear trend, no blockers, data is decisive
- medium: mixed signals or few tasks remaining
- low: minimal data, campaign just started, or many unknowns

Be honest — if a campaign looks fine, say it will finish on time. Do not manufacture urgency.`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a project timeline analyst. Output only valid JSON, no markdown." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const stripped = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const data = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ data });
  } catch (err) {
    console.error("campaign-predictions error:", err);
    return NextResponse.json({ error: "Failed to generate predictions" }, { status: 500 });
  }
}
