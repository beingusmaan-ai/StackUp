import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const template = await db.recurringTemplate.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
      tasks: {
        select: { id: true, title: true, status: true, dueDate: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: template });
}

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  estimatedHours: z.number().nullable().optional(),
  assigneeIds: z.array(z.string()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const template = await db.recurringTemplate.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "TEAM_MEMBER" && template.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { assigneeIds, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (assigneeIds !== undefined) {
    updateData.assigneeIds = assigneeIds.length > 0 ? assigneeIds.join(",") : null;
  }

  const updated = await db.recurringTemplate.update({ where: { id }, data: updateData });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const template = await db.recurringTemplate.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "TEAM_MEMBER" && template.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.recurringTemplate.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
