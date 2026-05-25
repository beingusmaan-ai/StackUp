import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

async function callerAdminDepts(session: { user: { id: string; email?: string | null } }): Promise<string[]> {
  let dbUserId = session.user.id;
  if (session.user.email) {
    const me = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (me) dbUserId = me.id;
  }
  const rows = await db.departmentMember.findMany({
    where: { userId: dbUserId, role: "ADMIN" },
    select: { departmentId: true },
  });
  return rows.map((r) => r.departmentId);
}

// POST { userId, role: "MEMBER" | "ADMIN" } — upsert membership
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { departmentId } = await params;

  if (session.user.role !== "ADMIN") {
    const adminDepts = await callerAdminDepts(session);
    if (!adminDepts.includes(departmentId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  const parsed = z.object({
    userId: z.string().min(1),
    role: z.enum(["MEMBER", "ADMIN"]).default("MEMBER"),
  }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const membership = await db.departmentMember.upsert({
    where: { departmentId_userId: { departmentId, userId: parsed.data.userId } },
    create: { departmentId, userId: parsed.data.userId, role: parsed.data.role },
    update: { role: parsed.data.role },
  });

  return NextResponse.json({ data: membership }, { status: 200 });
}

// DELETE { userId } — remove from department
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { departmentId } = await params;

  if (session.user.role !== "ADMIN") {
    const adminDepts = await callerAdminDepts(session);
    if (!adminDepts.includes(departmentId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  const parsed = z.object({ userId: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  await db.departmentMember.deleteMany({
    where: { departmentId, userId: parsed.data.userId },
  });

  return NextResponse.json({ success: true });
}
