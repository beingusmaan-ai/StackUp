import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }

  const { members } = await req.json();
  if (!members?.length) {
    return NextResponse.json({ error: "No team data provided" }, { status: 400 });
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `Analyze this marketing team's workload and recommend specific task rebalancing.

Team members (JSON):
${JSON.stringify(members, null, 2)}

Fields: id, name, role (system role), marketingRole (specialization), assigned (total tasks), completed, delayed (overdue), rate (completion %).

Return ONLY valid JSON, no markdown:
{
  "summary": "one sentence describing the overall workload situation",
  "overloaded": [
    { "id": "...", "name": "...", "reason": "specific reason why they're overloaded using their actual numbers" }
  ],
  "available": [
    { "id": "...", "name": "...", "capacityNote": "specific note about their available capacity" }
  ],
  "suggestions": [
    {
      "fromId": "...", "fromName": "...",
      "toId": "...", "toName": "...",
      "tasksToMove": number,
      "reason": "why this specific reassignment makes sense — mention roles, numbers"
    }
  ]
}

Rules:
- Only flag someone as overloaded if they have significantly more tasks or more delays than teammates
- Only suggest reassignments between members with compatible marketing roles
- If the team is balanced, overloaded and suggestions arrays can be empty
- Be specific — use actual names and numbers from the data`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a team management expert. Output only valid JSON, no markdown." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 1000,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const stripped = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object in response");
    const data = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ data });
  } catch (err) {
    console.error("workload-balancer error:", err);
    return NextResponse.json({ error: "Failed to analyze workload" }, { status: 500 });
  }
}
