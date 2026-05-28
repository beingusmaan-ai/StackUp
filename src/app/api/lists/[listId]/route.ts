import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { getCallerDeptAdminIds } from "@/lib/dept-auth";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
  position: z.number().optional(),
});

type SessionUser = { user: { id: string; email?: string | null; role?: string | null } };

async function canManageList(session: SessionUser, listId: string): Promise<boolean> {
  const deptAdminIds = await getCallerDeptAdminIds(session);
  if (deptAdminIds === null) return true; // global admin
  if (deptAdminIds.length === 0) return false;
  const list = await db.taskList.findUnique({
    where: { id: listId },
    select: { folder: { select: { campaign: { select: { departmentId: true } } } } },
  });
  return !!list?.folder?.campaign?.departmentId && deptAdminIds.includes(list.folder.campaign.departmentId);
}

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
          createdBy: { select: { id: true, name: true, image: true } },
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
  const { listId } = await params;

  if (!(await canManageList(session, listId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
  const { listId } = await params;

  if (!(await canManageList(session, listId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.taskList.delete({ where: { id: listId } });
  return NextResponse.json({ ok: true });
}
