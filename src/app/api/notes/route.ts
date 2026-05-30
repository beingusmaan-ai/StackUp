import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getDbUserId(email: string) {
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  return user?.id ?? null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getDbUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const notes = await db.note.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, content: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ data: notes });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getDbUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { content = "" } = await req.json().catch(() => ({}));

  const note = await db.note.create({
    data: { userId, content },
    select: { id: true, content: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ data: note }, { status: 201 });
}
