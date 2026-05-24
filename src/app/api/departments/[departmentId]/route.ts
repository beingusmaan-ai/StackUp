import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { departmentId } = await params;

  const dept = await db.department.findUnique({
    where: { id: departmentId },
    include: {
      members: { include: { user: { select: { id: true, name: true, image: true, marketingRole: true } } } },
      campaigns: {
        include: {
          _count: { select: { tasks: true } },
          tasks: { select: { status: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!dept) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: dept });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "TEAM_MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { departmentId } = await params;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const dept = await db.department.update({
    where: { id: departmentId },
    data: parsed.data,
  });

  return NextResponse.json({ data: dept });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { departmentId } = await params;

  const campaignCount = await db.campaign.count({ where: { departmentId } });
  if (campaignCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: this department has ${campaignCount} campaign(s). Reassign them first.` },
      { status: 409 }
    );
  }

  await db.department.delete({ where: { id: departmentId } });
  return NextResponse.json({ success: true });
}
