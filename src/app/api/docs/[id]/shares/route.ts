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

  const shares = await db.docShare.findMany({
    where: { docId: id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: shares });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { userId, role } = await req.json();

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const share = await db.docShare.upsert({
    where: { docId_userId: { docId: id, userId } },
    create: { docId: id, userId, role: role || "VIEWER" },
    update: { role: role || "VIEWER" },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  return NextResponse.json({ data: share }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { userId } = await req.json();

  const callerId = await getDbUserId(session);
  const doc = await db.doc.findUnique({ where: { id }, select: { createdById: true } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only doc owner or admin can remove shares, or a user can remove themselves
  if (doc.createdById !== callerId && session.user.role !== "ADMIN" && userId !== callerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.docShare.deleteMany({ where: { docId: id, userId } });
  return NextResponse.json({ ok: true });
}
