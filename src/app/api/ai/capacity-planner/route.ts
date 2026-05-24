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

  const prompt = `Score each team member's current capacity for taking on new work.

Team data (JSON):
${JSON.stringify(members, null, 2)}

Fields: id, name, role, marketingRole, assigned, completed, delayed, rate (completion %).

Capacity scoring hints:
- High rate + low assigned + 0 delayed = high capacity score (80-100)
- Medium rate or moderate assigned = medium capacity score (40-70)
- Low rate OR many delayed OR very high assigned = low capacity score (0-35)

For the status field use exactly one of these three string values: "available" for score 61-100, "busy" for score 31-60, "overloaded" for score 0-30.

Return ONLY a valid JSON object. Example structure (replace all values with real data):
{
  "summary": "one sentence about overall team capacity",
  "members": [
    {
      "id": "abc123",
      "name": "Jane Smith",
      "capacityScore": 75,
      "status": "available",
      "note": "Completed 8 of 10 tasks with no delays — has clear bandwidth"
    }
  ],
  "byRole": [
    {
      "role": "CONTENT_WRITER",
      "roleLabel": "Content Writer",
      "bestPickId": "abc123",
      "bestPickName": "Jane Smith",
      "reason": "Highest capacity score among content writers at 75"
    }
  ]
}

Rules:
- Include every member from the input in the members array
- Only include a role in byRole if at least one team member has that marketingRole (skip null roles)
- byRole picks the member with the highest capacityScore within each role
- Do not include any text outside the JSON object`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a team capacity planning expert. Output only valid JSON, no markdown." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1200,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const stripped = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object in response");
    const data = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ data });
  } catch (err) {
    console.error("capacity-planner error:", err);
    return NextResponse.json({ error: "Failed to calculate capacity" }, { status: 500 });
  }
}
