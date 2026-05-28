import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY)
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const { notes } = await req.json();
  if (!notes?.trim()) return NextResponse.json({ error: "No notes provided" }, { status: 400 });

  const users = await db.user.findMany({
    select: { id: true, name: true },
    take: 60,
  });

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `Extract all action items and tasks from these meeting notes. Return a JSON array only — no explanation, no markdown.

Each object must have:
- title: string (concise, max 100 chars)
- description: string (brief context, or "")
- priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
- assigneeName: string | null (person mentioned as responsible, or null)
- dueDate: string | null (ISO date YYYY-MM-DD if a date is mentioned, otherwise null)

Team members available: ${users.map((u) => u.name).join(", ")}

Meeting Notes:
${notes}

Return ONLY a valid JSON array, e.g.: [{"title":"...","description":"...","priority":"MEDIUM","assigneeName":null,"dueDate":null}]`;

  const res = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1024,
    messages: [
      { role: "system", content: "You extract tasks from meeting notes. Return only valid JSON arrays, no markdown fences, no explanation." },
      { role: "user", content: prompt },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? "[]";
  const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  let tasks: { title: string; description: string; priority: string; assigneeName: string | null; dueDate: string | null }[];
  try {
    tasks = JSON.parse(clean);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  const enriched = tasks.map((t) => {
    let assigneeId: string | null = null;
    if (t.assigneeName) {
      const hint = t.assigneeName.toLowerCase();
      const match = users.find(
        (u) =>
          u.name.toLowerCase().includes(hint) ||
          hint.includes(u.name.toLowerCase().split(" ")[0])
      );
      if (match) assigneeId = match.id;
    }
    return { ...t, assigneeId };
  });

  return NextResponse.json({ tasks: enriched });
}
