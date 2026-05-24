import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }

  const { members, today } = await req.json();
  if (!members?.length) {
    return NextResponse.json({ error: "No team data provided" }, { status: 400 });
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `Write a management performance digest for this marketing team.

Today: ${today}
Team data (JSON):
${JSON.stringify(members, null, 2)}

Fields: name, role, marketingRole, assigned, completed, delayed (overdue tasks), rate (completion %).

Return ONLY valid JSON, no markdown:
{
  "headline": "one punchy sentence summarizing the team's current state",
  "executiveSummary": "2-3 sentences giving the overall picture — use actual numbers",
  "topPerformers": [
    { "name": "...", "insight": "specific reason they stand out — use their actual numbers" }
  ],
  "atRisk": [
    { "name": "...", "issue": "specific issue — use their actual numbers, e.g. delayed tasks or low rate" }
  ],
  "patterns": "one paragraph about team-wide patterns, trends, or structural observations",
  "recommendations": [
    "specific actionable recommendation"
  ]
}

Rules:
- Be direct and use real numbers from the data — no generic filler
- topPerformers: members with completion rate ≥80% or notably low delays
- atRisk: members with delayed tasks, low completion rate, or high task load
- recommendations: 3-4 concrete actions a manager should take
- If the team is performing uniformly, say so — don't invent concerns`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are an experienced marketing team manager. Output only valid JSON, no markdown." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 1200,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const stripped = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object in response");
    const data = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ data });
  } catch (err) {
    console.error("team-digest error:", err);
    return NextResponse.json({ error: "Failed to generate digest" }, { status: 500 });
  }
}
