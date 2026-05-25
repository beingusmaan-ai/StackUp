import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI not configured — add GROQ_API_KEY to .env" }, { status: 503 });
  }

  const { question, history } = await req.json();
  if (!question?.trim()) return NextResponse.json({ error: "Question required" }, { status: 400 });

  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const messages = [
      {
        role: "system" as const,
        content: `You are StackUp AI, an intelligent assistant for StackUp. You help teams manage projects, tasks, campaigns, and workflows. Be concise, practical, and friendly. Format responses with markdown when helpful.`,
      },
      ...(history ?? []),
      { role: "user" as const, content: question },
    ];

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 1024,
    });

    const answer = completion.choices[0]?.message?.content ?? "I couldn't generate a response.";
    return NextResponse.json({ answer });
  } catch (err) {
    console.error("[POST /api/ai/ask]", err);
    return NextResponse.json({ error: "AI request failed. Please try again." }, { status: 500 });
  }
}
