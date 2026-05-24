import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }

  const { users, dateRange, today } = await req.json();
  if (!users?.length) {
    return NextResponse.json({ error: "No productivity data" }, { status: 400 });
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `Analyze this marketing team's productivity data and identify anomalies and patterns.

Today: ${today}
Period: ${dateRange}
Team productivity data: ${JSON.stringify(users)}

Fields per user: id, name, marketingRole, completed (tasks finished this period), onTime, delayed, activeTasks, overdueTasks, avgCompletionDays, completionRate (%).

Identify:
1. Individuals with unusually high or low performance compared to their peers
2. Concerning patterns: high delayed ratio, zero completions with many active tasks, long avg completion days
3. Positive standouts: high completion rate, low delays, strong throughput

Return ONLY a valid JSON object:
{
  "summary": "one sentence describing the overall productivity picture this period",
  "anomalies": [
    {
      "userId": "...",
      "userName": "...",
      "type": "positive" or "negative",
      "title": "short label e.g. 'Zero completions this week' or 'Top performer'",
      "detail": "specific observation using their actual numbers compared to team average"
    }
  ],
  "teamPatterns": [
    "one sentence describing a team-wide pattern"
  ]
}

Rules:
- Only flag genuine anomalies — someone 20%+ above or below team average, or a structural issue
- teamPatterns: 2-3 observations about the whole team, not individuals
- If the team is performing uniformly well, say so — fewer anomalies is fine
- Use real numbers in every detail field`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a productivity analyst. Output only valid JSON, no markdown." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 1000,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const stripped = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const data = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ data });
  } catch (err) {
    console.error("productivity-anomalies error:", err);
    return NextResponse.json({ error: "Failed to detect anomalies" }, { status: 500 });
  }
}
