import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const { query, users, today } = await req.json();
  if (!query?.trim()) return NextResponse.json({ error: "Query required" }, { status: 400 });

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `Convert this natural language query into task filters.

Today: ${today}
Team members: ${JSON.stringify(users)}
Query: "${query}"

Respond with valid JSON only (no markdown):
{
  "search": "keyword to search in task titles, or null",
  "status": "TODO|ASSIGNED|IN_PROGRESS|WAITING_APPROVAL|REVISION_REQUIRED|COMPLETED|BLOCKED or null",
  "priority": "LOW|MEDIUM|HIGH|URGENT or null",
  "dateFilter": "today|overdue|upcoming or null",
  "assigneeId": "user id from team members or null"
}

Examples:
- "overdue design tasks" → { "search": "design", "dateFilter": "overdue" }
- "Ahmed's urgent tasks" → { "priority": "URGENT", "assigneeId": "<ahmed-id>" }
- "blocked tasks" → { "status": "BLOCKED" }
- "tasks due today" → { "dateFilter": "today" }
- "high priority content" → { "priority": "HIGH", "search": "content" }

Only set fields that are clearly implied. Null everything else.`;

  try {
    const message = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 128,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = message.choices[0]?.message?.content?.trim() ?? "";
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({ data: parsed });
  } catch (err) {
    console.error("AI parse-filter error:", err);
    return NextResponse.json({ error: "AI filter parsing failed" }, { status: 500 });
  }
}
