import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }

  const { kpis, insights, today } = await req.json();

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `Write an executive summary for a marketing team's dashboard.

Today: ${today}
KPI data: ${JSON.stringify(kpis)}
System alerts: ${JSON.stringify(insights)}

KPI fields: activeTasks, completedThisWeek (with trend %), overdueTasks, activeCampaigns, teamCapacity (% avg), deadlinesAtRisk, approvalPending.
Trend is % change vs previous period — positive is improvement.

Return ONLY a valid JSON object:
{
  "headline": "one punchy sentence summarizing the overall state",
  "narrative": "2-3 sentences with the full picture — use actual numbers, mention what improved and what needs attention",
  "keyPoints": [
    "specific observation using real numbers"
  ],
  "callToAction": "one sentence — the single most important thing a manager should do right now"
}

Rules:
- keyPoints: 3-4 items maximum, each grounded in the actual data
- Be specific — use the real numbers, mention trends
- If everything looks good, say so clearly — don't manufacture concern
- callToAction must be actionable and concrete`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a concise executive reporting assistant. Output only valid JSON, no markdown." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 600,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const stripped = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const data = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ data });
  } catch (err) {
    console.error("executive-summary error:", err);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
