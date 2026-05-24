import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const { name, goal, budget, department } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Campaign name required" }, { status: 400 });

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `You are a senior marketing strategist. Generate a structured campaign brief.

Campaign name: "${name}"${goal ? `\nGoal: "${goal}"` : ""}${budget ? `\nBudget: $${budget}` : ""}${department ? `\nDepartment: ${department}` : ""}

Respond with valid JSON only (no markdown):
{
  "description": "2-3 sentence campaign overview",
  "objectives": ["objective 1", "objective 2", "objective 3"],
  "targetAudience": "specific audience description",
  "keyMessages": ["message 1", "message 2", "message 3"],
  "kpis": ["KPI 1 with target", "KPI 2 with target", "KPI 3 with target"],
  "channels": ["channel 1", "channel 2", "channel 3"],
  "goals": "concise goals and KPIs paragraph for campaign record"
}

Be specific and actionable. Tailor everything to the campaign name and context.`;

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
    console.error("AI campaign-brief error:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
