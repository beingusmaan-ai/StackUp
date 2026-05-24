import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const { theme, product, audience } = await req.json();
  if (!theme?.trim()) return NextResponse.json({ error: "Theme required" }, { status: 400 });

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `Generate 5 creative, memorable marketing campaign names.

Theme/context: "${theme}"${product ? `\nProduct/service: ${product}` : ""}${audience ? `\nTarget audience: ${audience}` : ""}

Respond with valid JSON only (no markdown):
{ "names": ["Name 1", "Name 2", "Name 3", "Name 4", "Name 5"] }

Rules:
- Make each name distinct in style (e.g. one punchy, one poetic, one action-driven, one playful, one professional)
- Keep names short (2-5 words)
- Make them memorable and campaign-ready
- No hashtags in the name itself`;

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
    console.error("AI campaign-names error:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
