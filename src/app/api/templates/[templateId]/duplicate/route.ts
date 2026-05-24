import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "TEAM_MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { templateId } = await params;

  const source = await db.taskTemplate.findUnique({
    where: { id: templateId },
    include: {
      groups: {
        orderBy: { position: "asc" },
        include: {
          tasks: {
            orderBy: { position: "asc" },
            include: { checklist: { orderBy: { position: "asc" } } },
          },
        },
      },
    },
  });

  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const copy = await db.taskTemplate.create({
    data: {
      name: `${source.name} (Copy)`,
      description: source.description,
      category: source.category,
      departmentId: source.departmentId,
      defaultPriority: source.defaultPriority,
      estimatedDays: source.estimatedDays,
      tags: source.tags,
      isBuiltIn: false,
      createdById: session.user.id,
      groups: {
        create: source.groups.map((g, gi) => ({
          name: g.name,
          color: g.color,
          position: gi,
          tasks: {
            create: g.tasks.map((t, ti) => ({
              title: t.title,
              description: t.description,
              taskType: t.taskType,
              assignedRole: t.assignedRole,
              priority: t.priority,
              estimatedHours: t.estimatedHours,
              dayOffset: t.dayOffset,
              position: ti,
              checklist: {
                create: t.checklist.map((c, ci) => ({ text: c.text, position: ci })),
              },
            })),
          },
        })),
      },
    },
  });

  return NextResponse.json({ data: copy }, { status: 201 });
}
