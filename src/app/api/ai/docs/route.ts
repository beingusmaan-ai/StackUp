import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

const SYSTEM = `You are StackUp Mind, an AI writing assistant built into StackUp — a professional project management and marketing platform. Help teams write, edit, and improve their content.

Rules:
- Output only the requested content. No preambles like "Here is...", "Certainly!", or "Sure!".
- Be professional, clear, and concise.
- Use proper formatting (headings, bullets, paragraphs) appropriate to the content type.
- Match the tone and style expected for business/marketing content.`;

function buildPrompt(action: string, prompt?: string, content?: string, context?: string, tone?: string): string {
  const ctx = context ? `Document: "${context}"\n\n` : "";
  switch (action) {
    case "write":       return `${ctx}Write professional content for: ${prompt}`;
    case "rewrite":     return `${ctx}Rewrite the following to be clearer and more impactful:\n\n${content}`;
    case "summarize":   return `${ctx}Summarize the following concisely:\n\n${content}`;
    case "expand":      return `${ctx}Expand and elaborate on the following with more detail:\n\n${content}`;
    case "fix-grammar": return `Correct grammar, spelling, and punctuation. Return only the corrected text:\n\n${content}`;
    case "shorter":     return `Make the following more concise without losing key information:\n\n${content}`;
    case "longer":      return `Expand the following with more detail, examples, and depth:\n\n${content}`;
    case "change-tone": return `Rewrite the following in a ${tone ?? "professional"} tone:\n\n${content}`;
    case "custom":      return `${ctx}${prompt}${content ? `\n\nContent:\n${content}` : ""}`;
    default:            return prompt ?? "";
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI not configured — add GROQ_API_KEY to environment" }, { status: 503 });
  }

  const { action, prompt, content, context, tone } = await req.json();
  const userPrompt = buildPrompt(action, prompt, content, context, tone);

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const groqStream = await client.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 2048,
          stream: true,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user",   content: userPrompt },
          ],
        });

        for await (const chunk of groqStream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new NextResponse(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
