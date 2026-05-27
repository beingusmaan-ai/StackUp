import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const eventSchema = z.object({
  title:       z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  startTime:   z.string(),
  endTime:     z.string(),
  allDay:      z.boolean().default(false),
  type:        z.enum(["MEETING","TIME_BLOCK","FOCUS","REMINDER"]).default("MEETING"),
  color:       z.string().optional().nullable(),
  taskId:      z.string().optional().nullable(),
});

async function resolveUserId(session: { user: { id: string; email?: string | null } }) {
  let userId = session.user.id;
  if (session.user.email) {
    const me = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (me) userId = me.id;
  }
  return userId;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await resolveUserId(session);

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end   = searchParams.get("end");

  const events = await db.calendarEvent.findMany({
    where: {
      userId,
      ...(start && end ? { startTime: { gte: new Date(start), lte: new Date(end) } } : {}),
    },
    orderBy: { startTime: "asc" },
    include: { task: { select: { id: true, title: true, priority: true } } },
  });

  return NextResponse.json({ data: events });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = await resolveUserId(session);

    const body = await req.json();
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const resolvedTaskId = parsed.data.taskId
      ? (await db.task.findUnique({ where: { id: parsed.data.taskId }, select: { id: true } }))?.id ?? null
      : null;

    const event = await db.calendarEvent.create({
      data: {
        ...parsed.data,
        startTime: new Date(parsed.data.startTime),
        endTime:   new Date(parsed.data.endTime),
        userId,
        taskId: resolvedTaskId,
      },
      include: { task: { select: { id: true, title: true, priority: true } } },
    });

    return NextResponse.json({ data: event }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/planner/events]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
