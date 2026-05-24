import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const { campaignName, description, goals, audience } = await req.json();
  if (!campaignName?.trim()) return NextResponse.json({ error: "Campaign name required" }, { status: 400 });

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `You are a senior marketing copywriter. Generate campaign copy assets.

Campaign: "${campaignName}"${description ? `\nDescription: ${description}` : ""}${goals ? `\nGoals: ${goals}` : ""}${audience ? `\nAudience: ${audience}` : ""}

Respond with valid JSON only (no markdown):
{
  "adHeadlines": ["headline 1", "headline 2", "headline 3"],
  "instagramCaptions": ["full caption with emojis 1", "full caption with emojis 2", "full caption with emojis 3"],
  "twitterPosts": ["tweet 1 (under 280 chars)", "tweet 2", "tweet 3"],
  "emailSubjects": ["subject line 1", "subject line 2", "subject line 3", "subject line 4", "subject line 5"],
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8", "#tag9", "#tag10"],
  "ctaOptions": ["CTA 1", "CTA 2", "CTA 3"]
}

Make each piece distinct in tone and approach. Be creative but brand-appropriate.`;

  try {
    const message = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1536,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = message.choices[0]?.message?.content?.trim() ?? "";
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({ data: parsed });
  } catch (err) {
    console.error("AI campaign-copy error:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
