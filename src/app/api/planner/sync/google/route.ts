import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncFromGoogle } from "@/lib/calendar-sync";

async function resolveUserId(session: { user: { id: string; email?: string | null } }) {
  if (session.user.email) {
    const me = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (me) return me.id;
  }
  return session.user.id;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = await resolveUserId(session);
    await syncFromGoogle(userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = await resolveUserId(session);
    await db.calendarConnection.deleteMany({ where: { userId, provider: "GOOGLE" } });
    // Clear external IDs from synced events (keep events locally, just detach)
    await db.calendarEvent.updateMany({
      where: { userId, syncSource: "GOOGLE" },
      data:  { googleEventId: null, syncSource: null },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
