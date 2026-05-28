import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ALL_MODELS } from "@/lib/ai-models";

const KEY_MAP: Record<string, string | undefined> = {
  GROQ_API_KEY:           process.env.GROQ_API_KEY,
  OPENAI_API_KEY:         process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY:      process.env.ANTHROPIC_API_KEY,
  GOOGLE_GEMINI_API_KEY:  process.env.GOOGLE_GEMINI_API_KEY,
};

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const available = ALL_MODELS.filter((m) => !!KEY_MAP[m.envKey]);
  return NextResponse.json({ models: available });
}
