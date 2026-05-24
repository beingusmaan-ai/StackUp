import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const listSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().default("#6366f1"),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { folderId } = await params;

  const lists = await db.taskList.findMany({
    where: { folderId },
    orderBy: { position: "asc" },
    include: { _count: { select: { tasks: true } } },
  });

  return NextResponse.json({ data: lists });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "TEAM_MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { folderId } = await params;

  const body = await req.json();
  const parsed = listSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const count = await db.taskList.count({ where: { folderId } });

  const list = await db.taskList.create({
    data: { ...parsed.data, folderId, position: count },
    include: { _count: { select: { tasks: true } } },
  });

  return NextResponse.json({ data: list }, { status: 201 });
}
