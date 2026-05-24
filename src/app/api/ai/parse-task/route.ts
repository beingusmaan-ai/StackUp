import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const { text, users, today } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Text required" }, { status: 400 });

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `Parse this natural language task into structured fields.

Today's date: ${today}
Team members: ${JSON.stringify(users)}

Task input: "${text}"

Respond with valid JSON only (no markdown, no code blocks):
{
  "title": "clean actionable task title without meta-info",
  "priority": "LOW|MEDIUM|HIGH|URGENT",
  "dueDate": "YYYY-MM-DD or null",
  "assigneeId": "exact user id from team members list or null",
  "taskType": "inferred type e.g. Design, Content, Video, Strategy or null",
  "estimatedHours": number or null
}

Rules:
- Resolve relative dates using today's date (today, tomorrow, this Friday, next week, etc.)
- Match assignee by name (fuzzy: "Ahmed" → find user whose name contains Ahmed)
- Infer priority: urgent/ASAP → URGENT, high priority → HIGH, low priority → LOW, else MEDIUM
- Strip assignee/date/priority info from title — keep it clean
- Only use user IDs from the provided team members list`;

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
    console.error("AI parse-task error:", err);
    return NextResponse.json({ error: "AI parsing failed" }, { status: 500 });
  }
}
