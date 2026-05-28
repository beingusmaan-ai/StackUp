import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = process.env.GOOGLE_GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "GOOGLE_GEMINI_API_KEY not set" }, { status: 503 });

  // Try both v1 and v1beta
  const results: Record<string, unknown> = {};

  for (const version of ["v1", "v1beta"]) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/${version}/models?key=${key}`
      );
      const data = await res.json();
      results[version] = data.models
        ? data.models
            .filter((m: { supportedGenerationMethods?: string[] }) =>
              m.supportedGenerationMethods?.includes("generateContent")
            )
            .map((m: { name: string; displayName?: string }) => ({
              name: m.name,
              displayName: m.displayName,
            }))
        : data;
    } catch (e) {
      results[version] = { error: String(e) };
    }
  }

  return NextResponse.json(results);
}
