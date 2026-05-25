import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional(),
});

async function resolveUserId(session: { user: { id: string; email?: string | null } }): Promise<string | null> {
  let user = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  if (!user && session.user.email) {
    user = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  }
  return user?.id ?? null;
}

async function getMember(workspaceId: string, userId: string) {
  return db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = await params;

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await getMember(workspaceId, userId);
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } } },
      _count: { select: { campaigns: true, members: true } },
    },
  });

  return NextResponse.json({ data: workspace });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = await params;

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await getMember(workspaceId, userId);
  if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const workspace = await db.workspace.update({
    where: { id: workspaceId },
    data: parsed.data,
    include: { _count: { select: { campaigns: true, members: true } } },
  });

  return NextResponse.json({ data: workspace });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = await params;

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await getMember(workspaceId, userId);
  if (!member || member.role !== "OWNER") {
    return NextResponse.json({ error: "Only the owner can delete a workspace" }, { status: 403 });
  }

  await db.workspace.delete({ where: { id: workspaceId } });
  return NextResponse.json({ success: true });
}
