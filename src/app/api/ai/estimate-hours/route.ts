import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const { title, taskType } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `Estimate realistic hours for this marketing task.

Task: "${title}"${taskType ? `\nType: ${taskType}` : ""}

Respond with valid JSON only (no markdown):
{ "hours": 3 }

Realistic ranges for marketing:
- Quick social post / caption: 0.5–1h
- Social media graphic: 1–3h
- Blog post / article: 3–6h
- Video editing (short): 3–8h
- Campaign strategy doc: 4–10h
- Paid ad setup: 1–3h
- Email newsletter: 2–4h
- Full graphic design: 4–12h
- Influencer brief: 1–2h`;

  try {
    const message = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 64,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = message.choices[0]?.message?.content?.trim() ?? "";
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({ data: parsed });
  } catch (err) {
    console.error("AI estimate-hours error:", err);
    return NextResponse.json({ error: "AI estimation failed" }, { status: 500 });
  }
}
