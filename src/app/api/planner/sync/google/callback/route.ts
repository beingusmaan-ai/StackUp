import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(`${origin}/planner?sync_error=google`);
  }

  let userId: string;
  try {
    userId = Buffer.from(state, "base64").toString("utf8");
  } catch {
    return NextResponse.redirect(`${origin}/planner?sync_error=google`);
  }

  const redirectUri = `${origin}/api/planner/sync/google/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  redirectUri,
      grant_type:    "authorization_code",
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokens.access_token) return NextResponse.redirect(`${origin}/planner?sync_error=google`);

  // Get Google account email
  let email: string | null = null;
  try {
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();
    email = profile.email ?? null;
  } catch { /* optional */ }

  await db.calendarConnection.upsert({
    where:  { userId_provider: { userId, provider: "GOOGLE" } },
    create: {
      userId, provider: "GOOGLE",
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt:    tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      email,
    },
    update: {
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt:    tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      email,
      syncToken:    null,
    },
  });

  return NextResponse.redirect(`${origin}/planner?synced=google`);
}
