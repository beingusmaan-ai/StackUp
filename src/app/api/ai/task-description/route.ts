import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI not configured — add GROQ_API_KEY to .env.local" }, { status: 503 });
  }

  const { title, taskType, campaignName } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `You are a marketing project manager. Generate a professional task description for a marketing team.

Task title: "${title}"${taskType ? `\nTask type: ${taskType}` : ""}${campaignName ? `\nCampaign: ${campaignName}` : ""}

Respond with valid JSON only (no markdown, no code blocks):
{
  "description": "2-3 sentence professional description of what this task involves and its goal",
  "checklist": ["specific action item 1", "specific action item 2", "specific action item 3", "specific action item 4", "specific action item 5"]
}

The description should explain WHAT needs to be done and its business purpose.
Checklist items must be specific, actionable steps to complete this task.
Keep everything concise and practical for a marketing team.`;

  try {
    const message = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.choices[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(text);
    return NextResponse.json({ data: parsed });
  } catch (err) {
    console.error("AI task description error:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
