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

async function canManageFolder(session: SessionUser, folderId: string): Promise<boolean> {
  const deptAdminIds = await getCallerDeptAdminIds(session);
  if (deptAdminIds === null) return true; // global admin
  if (deptAdminIds.length === 0) return false;
  const folder = await db.projectFolder.findUnique({
    where: { id: folderId },
    select: { campaign: { select: { departmentId: true } } },
  });
  return !!folder?.campaign?.departmentId && deptAdminIds.includes(folder.campaign.departmentId);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { folderId } = await params;

  if (!(await canManageFolder(session, folderId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const folder = await db.projectFolder.update({
    where: { id: folderId },
    data: parsed.data,
    include: { lists: { orderBy: { position: "asc" } } },
  });

  return NextResponse.json({ data: folder });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { folderId } = await params;

  if (!(await canManageFolder(session, folderId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.projectFolder.delete({ where: { id: folderId } });
  return NextResponse.json({ ok: true });
}
