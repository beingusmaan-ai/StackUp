import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  category: z.enum(["CAMPAIGN", "TASK", "DEPARTMENT", "CUSTOM"]).optional(),
  departmentId: z.string().optional().nullable(),
  defaultPriority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  estimatedDays: z.number().optional().nullable(),
  tags: z.string().optional().nullable(),
  isArchived: z.boolean().optional(),
  groups: z
    .array(
      z.object({
        name: z.string().min(1),
        color: z.string().default("#6366f1"),
        position: z.number().default(0),
        tasks: z
          .array(
            z.object({
              title: z.string().min(1),
              description: z.string().optional().nullable(),
              taskType: z.string().optional().nullable(),
              assignedRole: z.string().optional().nullable(),
              priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
              estimatedHours: z.number().optional().nullable(),
              dayOffset: z.number().optional().nullable(),
              position: z.number().default(0),
              checklist: z
                .array(z.object({ text: z.string().min(1), position: z.number().default(0) }))
                .default([]),
            })
          )
          .default([]),
      })
    )
    .optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { templateId } = await params;

  const template = await db.taskTemplate.findUnique({
    where: { id: templateId },
    include: {
      department: { select: { id: true, name: true, color: true } },
      createdBy: { select: { id: true, name: true } },
      groups: {
        orderBy: { position: "asc" },
        include: {
          tasks: {
            orderBy: { position: "asc" },
            include: {
              checklist: { orderBy: { position: "asc" } },
              dependsOn: { select: { dependsOnId: true } },
            },
          },
        },
      },
      versions: {
        orderBy: { version: "desc" },
        take: 10,
        select: { id: true, version: true, note: true, createdAt: true, createdBy: { select: { name: true } } },
      },
    },
  });

  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: template });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "TEAM_MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { templateId } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { groups, ...meta } = parsed.data;

  // If groups are provided, replace all groups atomically
  if (groups !== undefined) {
    // Delete existing groups (cascades to tasks + checklists)
    await db.templateGroup.deleteMany({ where: { templateId } });
    // Recreate
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi];
      const group = await db.templateGroup.create({
        data: { templateId, name: g.name, color: g.color, position: gi },
      });
      for (let ti = 0; ti < g.tasks.length; ti++) {
        const t = g.tasks[ti];
        const task = await db.templateTask.create({
          data: {
            groupId: group.id,
            title: t.title,
            description: t.description,
            taskType: t.taskType,
            assignedRole: t.assignedRole,
            priority: t.priority,
            estimatedHours: t.estimatedHours,
            dayOffset: t.dayOffset,
            position: ti,
          },
        });
        if (t.checklist.length > 0) {
          await db.templateChecklist.createMany({
            data: t.checklist.map((c, ci) => ({ templateTaskId: task.id, text: c.text, position: ci })),
          });
        }
      }
    }
  }

  const template = await db.taskTemplate.update({
    where: { id: templateId },
    data: { ...meta, updatedAt: new Date() },
    include: {
      groups: {
        orderBy: { position: "asc" },
        include: { tasks: { orderBy: { position: "asc" }, include: { checklist: true } } },
      },
    },
  });

  // Save a new version snapshot
  const latestVersion = await db.templateVersion.findFirst({
    where: { templateId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  await db.templateVersion.create({
    data: {
      templateId,
      version: (latestVersion?.version ?? 0) + 1,
      snapshot: JSON.stringify(body),
      note: "Updated",
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ data: template });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "TEAM_MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { templateId } = await params;
  await db.taskTemplate.delete({ where: { id: templateId } });
  return NextResponse.json({ success: true });
}
