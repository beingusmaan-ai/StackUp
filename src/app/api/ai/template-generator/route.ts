import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }

  const { description, category, estimatedDays } = await req.json();
  if (!description?.trim()) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `Generate a complete marketing workflow template for: "${description}"
Category: ${category || "CAMPAIGN"}
${estimatedDays ? `Estimated duration: ${estimatedDays} days` : ""}

Return ONLY valid JSON, no markdown, no explanation. Use this exact structure:
{
  "name": "concise template name",
  "description": "one sentence describing what this template is for",
  "category": "${category || "CAMPAIGN"}",
  "estimatedDays": number,
  "tags": "comma,separated,tags",
  "defaultPriority": "MEDIUM",
  "groups": [
    {
      "name": "Phase name (e.g. Strategy, Content, Design, Review, Launch)",
      "color": "pick one: #6366f1 #10b981 #f59e0b #3b82f6 #8b5cf6 #ec4899 #14b8a6 #e8170b",
      "tasks": [
        {
          "title": "specific task title",
          "description": "brief SOP note or what needs to be done",
          "taskType": "Content|Design|Video|Meeting|Review|Research|Other",
          "assignedRole": "CONTENT_WRITER|GRAPHIC_DESIGNER|VIDEO_EDITOR|SOCIAL_MEDIA_MANAGER|SEO_SPECIALIST|PERFORMANCE_MARKETER|CRM_EMAIL_MARKETER|MARKETING_MANAGER",
          "priority": "LOW|MEDIUM|HIGH|URGENT",
          "estimatedHours": number between 1 and 16,
          "dayOffset": number (days before campaign deadline, spread across timeline e.g. 21, 18, 14, 10, 7, 3, 1)
        }
      ]
    }
  ]
}

Rules:
- 3 to 5 groups (phases like Strategy, Content Creation, Design, Review & Approval, Launch)
- 3 to 6 tasks per group, all with specific actionable titles
- Each task must have an assignedRole from the list above
- dayOffset decreases as tasks get closer to deadline (e.g. first tasks at high offset, last tasks at low offset)
- estimatedHours must be a realistic number 1-16
- No placeholder text, all tasks must be relevant to the described campaign`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a marketing workflow expert. Output only valid JSON with no markdown fences, no commentary." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const data = JSON.parse(cleaned);

    return NextResponse.json({ data });
  } catch (err) {
    console.error("template-generator error:", err);
    return NextResponse.json({ error: "Failed to generate template" }, { status: 500 });
  }
}
