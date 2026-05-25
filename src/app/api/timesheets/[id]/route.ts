import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  hours: z.number().min(0.25).max(24),
  note: z.string().optional().nullable(),
});

async function resolveCurrentDbUserId(session: { user: { id: string; email?: string | null } }): Promise<string> {
  if (session.user.email) {
    const me = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (me) return me.id;
  }
  return session.user.id;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentDbUserId = await resolveCurrentDbUserId(session);

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const existing = await db.timeEntry.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "TEAM_MEMBER" && existing.userId !== currentDbUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const entry = await db.timeEntry.update({
    where: { id },
    data: { hours: parsed.data.hours, note: parsed.data.note ?? null },
    include: { task: { select: { id: true, title: true } } },
  });

  return NextResponse.json({ data: entry });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentDbUserId = await resolveCurrentDbUserId(session);

  const { id } = await params;

  const existing = await db.timeEntry.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "TEAM_MEMBER" && existing.userId !== currentDbUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.timeEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
