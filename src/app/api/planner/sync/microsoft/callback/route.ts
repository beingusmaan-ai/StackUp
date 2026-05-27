import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(`${origin}/planner?sync_error=microsoft`);
  }

  let userId: string;
  try {
    userId = Buffer.from(state, "base64").toString("utf8");
  } catch {
    return NextResponse.redirect(`${origin}/planner?sync_error=microsoft`);
  }

  const redirectUri = `${origin}/api/planner/sync/microsoft/callback`;

  const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      redirect_uri:  redirectUri,
      grant_type:    "authorization_code",
      scope:         "Calendars.ReadWrite offline_access User.Read",
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokens.access_token) return NextResponse.redirect(`${origin}/planner?sync_error=microsoft`);

  // Get Microsoft account email
  let email: string | null = null;
  try {
    const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();
    email = profile.mail ?? profile.userPrincipalName ?? null;
  } catch { /* optional */ }

  await db.calendarConnection.upsert({
    where:  { userId_provider: { userId, provider: "MICROSOFT" } },
    create: {
      userId, provider: "MICROSOFT",
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
      deltaLink:    null,
    },
  });

  return NextResponse.redirect(`${origin}/planner?synced=microsoft`);
}
