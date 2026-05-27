import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pushToAllProviders } from "@/lib/calendar-sync";

async function resolveUserId(session: { user: { id: string; email?: string | null } }) {
  let userId = session.user.id;
  if (session.user.email) {
    const me = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (me) userId = me.id;
  }
  return userId;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = await resolveUserId(session);
    const { id } = await params;

    const existing = await db.calendarEvent.findUnique({ where: { id }, select: { userId: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { title, description, startTime, endTime, allDay, type, color, taskId } = body;

    const event = await db.calendarEvent.update({
      where: { id },
      data: {
        ...(title       !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(startTime   !== undefined && { startTime: new Date(startTime) }),
        ...(endTime     !== undefined && { endTime: new Date(endTime) }),
        ...(allDay      !== undefined && { allDay }),
        ...(type        !== undefined && { type }),
        ...(color       !== undefined && { color }),
        ...(taskId      !== undefined && { taskId: taskId || null }),
      },
      include: { task: { select: { id: true, title: true, priority: true } } },
    });

    pushToAllProviders(userId, { ...event, startTime: event.startTime, endTime: event.endTime }, "update").catch(console.error);

    return NextResponse.json({ data: event });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = await resolveUserId(session);
    const { id } = await params;

    const existing = await db.calendarEvent.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Push delete to providers before removing locally
    await pushToAllProviders(userId, { ...existing, startTime: existing.startTime, endTime: existing.endTime }, "delete").catch(console.error);

    await db.calendarEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
