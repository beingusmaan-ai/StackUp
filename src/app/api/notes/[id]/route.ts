import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getDbUserId(email: string) {
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  return user?.id ?? null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getDbUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const { content } = await req.json();

  const existing = await db.note.findUnique({ where: { id }, select: { userId: true } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const note = await db.note.update({
    where: { id },
    data: { content },
    select: { id: true, content: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ data: note });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getDbUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;

  const existing = await db.note.findUnique({ where: { id }, select: { userId: true } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.note.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
