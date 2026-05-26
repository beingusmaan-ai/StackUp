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

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docs = await db.doc.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      icon: true,
      parentId: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: docs });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getDbUserId(session);
  const { title, parentId, icon } = await req.json();

  const doc = await db.doc.create({
    data: {
      title: title || "Untitled",
      parentId: parentId ?? null,
      icon: icon ?? null,
      createdById: userId,
    },
    select: {
      id: true, title: true, icon: true, parentId: true,
      createdById: true, createdAt: true, updatedAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: doc }, { status: 201 });
}
