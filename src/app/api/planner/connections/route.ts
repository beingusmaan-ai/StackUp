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
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = await resolveUserId(session);
    const connections = await db.calendarConnection.findMany({
      where:  { userId },
      select: { provider: true, email: true, updatedAt: true },
    });
    return NextResponse.json({ data: connections });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
