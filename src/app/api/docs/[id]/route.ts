import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getDbUserId(session: { user: { id: string; email?: string | null } }) {
  if (session.user.email) {
    const me = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (me) return me.id;
  }
  return session.user.id;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = await getDbUserId(session);

  const doc = await db.doc.findFirst({
    where: {
      id,
      OR: [
        { createdById: userId },
        { shares: { some: { userId } } },
      ],
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      shares: { select: { userId: true, role: true } },
      campaign: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
    },
  });

  if (!doc) return NextResponse.json({ error: "Not found or access denied" }, { status: 404 });
  return NextResponse.json({ data: doc });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = await getDbUserId(session);
  const body = await req.json();
  const { title, content, icon, parentId, isPublic, campaignId, taskId } = body;

  // Check access: must be owner or have EDITOR share
  const access = await db.doc.findFirst({
    where: {
      id,
      OR: [
        { createdById: userId },
        { shares: { some: { userId, role: "EDITOR" } } },
      ],
    },
    select: { id: true },
  });
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const doc = await db.doc.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(icon !== undefined && { icon }),
      ...(parentId !== undefined && { parentId }),
      ...(isPublic !== undefined && { isPublic }),
      ...(campaignId !== undefined && { campaignId: campaignId || null }),
      ...(taskId !== undefined && { taskId: taskId || null }),
    },
    select: {
      id: true, title: true, icon: true, parentId: true,
      createdById: true, updatedAt: true,
    },
  });

  return NextResponse.json({ data: doc });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = await getDbUserId(session);

  const doc = await db.doc.findUnique({ where: { id }, select: { createdById: true } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.createdById !== userId && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.doc.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
