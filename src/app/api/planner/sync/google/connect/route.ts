import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function resolveUserId(session: { user: { id: string; email?: string | null } }) {
  if (session.user.email) {
    const me = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (me) return me.id;
  }
  return session.user.id;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 });

  const userId = await resolveUserId(session);
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/planner/sync/google/callback`;
  const state = Buffer.from(userId).toString("base64");

  const params = new URLSearchParams({
    client_id:    clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope:        "https://www.googleapis.com/auth/calendar",
    access_type:  "offline",
    prompt:       "consent",
    state,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
