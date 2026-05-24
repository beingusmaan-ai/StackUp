import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI not configured — add GROQ_API_KEY to .env.local" }, { status: 503 });
  }

  const { goal, campaignName } = await req.json();
  if (!goal?.trim()) return NextResponse.json({ error: "Goal required" }, { status: 400 });

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `You are a senior marketing project manager. Break down the following campaign goal into a structured task plan for a marketing team.

Goal: "${goal}"${campaignName ? `\nCampaign name: ${campaignName}` : ""}

Respond with valid JSON only (no markdown, no code blocks):
{
  "groups": [
    {
      "name": "Phase or department name (e.g. Strategy, Content Creation, Design, Paid Media, Launch)",
      "tasks": [
        {
          "title": "Specific actionable task title",
          "assignedRole": "one of: CONTENT_WRITER, GRAPHIC_DESIGNER, MEDIA_BUYER, SEO_SPECIALIST, VIDEO_EDITOR, SOCIAL_MEDIA_MANAGER, CAMPAIGN_MANAGER, COPYWRITER — or null if unclear",
          "priority": "LOW, MEDIUM, HIGH, or URGENT",
          "estimatedHours": 3
        }
      ]
    }
  ]
}

Rules:
- Create 3-5 logical groups
- Each group: 3-6 specific tasks
- Total tasks: 12-20
- Hours per task: 1-16 (realistic for marketing work)
- Be specific to the goal — no generic tasks
- Assign roles based on task type`;

  try {
    const message = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.choices[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(text);
    return NextResponse.json({ data: parsed });
  } catch (err) {
    console.error("AI task breakdown error:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
