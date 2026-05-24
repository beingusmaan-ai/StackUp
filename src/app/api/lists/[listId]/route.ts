import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
  position: z.number().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { listId } = await params;

  const list = await db.taskList.findUnique({
    where: { id: listId },
    include: {
      folder: { select: { id: true, name: true, campaignId: true } },
      _count: { select: { tasks: true } },
      tasks: {
        where: { parentTaskId: null },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
        include: {
          assignees: { include: { user: { select: { id: true, name: true, image: true } } } },
          _count: { select: { subTasks: true, comments: true } },
        },
      },
    },
  });

  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: list });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "TEAM_MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { listId } = await params;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const list = await db.taskList.update({
    where: { id: listId },
    data: parsed.data,
    include: { _count: { select: { tasks: true } } },
  });

  return NextResponse.json({ data: list });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "TEAM_MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { listId } = await params;

  await db.taskList.delete({ where: { id: listId } });
  return NextResponse.json({ ok: true });
}
