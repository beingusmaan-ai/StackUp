import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const checklistSchema = z.object({
  text: z.string().min(1),
  position: z.number().default(0),
});

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  taskType: z.string().optional().nullable(),
  assignedRole: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  estimatedHours: z.number().optional().nullable(),
  dayOffset: z.number().optional().nullable(),
  position: z.number().default(0),
  checklist: z.array(checklistSchema).default([]),
});

const groupSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().default("#6366f1"),
  position: z.number().default(0),
  tasks: z.array(taskSchema).default([]),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  category: z.enum(["CAMPAIGN", "TASK", "DEPARTMENT", "CUSTOM"]).default("CUSTOM"),
  departmentId: z.string().optional().nullable(),
  defaultPriority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  estimatedDays: z.number().optional().nullable(),
  tags: z.string().optional().nullable(),
  groups: z.array(groupSchema).default([]),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const departmentId = searchParams.get("departmentId");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { isArchived: false };
  if (category && category !== "ALL") where.category = category;
  if (search) where.name = { contains: search };
  if (departmentId) {
    where.departmentId = departmentId;
  }

  const templates = await db.taskTemplate.findMany({
    where,
    orderBy: [{ isBuiltIn: "desc" }, { useCount: "desc" }, { createdAt: "desc" }],
    include: {
      department: { select: { id: true, name: true, color: true } },
      createdBy: { select: { id: true, name: true } },
      groups: {
        orderBy: { position: "asc" },
        include: {
          tasks: {
            orderBy: { position: "asc" },
            select: { id: true, title: true, assignedRole: true, priority: true, estimatedHours: true, dayOffset: true },
          },
        },
      },
      _count: { select: { groups: true } },
    },
  });

  const withCounts = templates.map((t) => ({
    ...t,
    taskCount: t.groups.reduce((acc, g) => acc + g.tasks.length, 0),
  }));

  return NextResponse.json({ data: withCounts });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "TEAM_MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { groups, ...meta } = parsed.data;

  const template = await db.taskTemplate.create({
    data: {
      ...meta,
      createdById: session.user.id,
      groups: {
        create: groups.map((g, gi) => ({
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
                create: t.checklist.map((c, ci) => ({
                  text: c.text,
                  position: ci,
                })),
              },
            })),
          },
        })),
      },
    },
    include: {
      groups: {
        include: { tasks: { include: { checklist: true } } },
      },
    },
  });

  // Auto-save first version
  const snapshot = JSON.stringify({ meta, groups });
  await db.templateVersion.create({
    data: {
      templateId: template.id,
      version: 1,
      snapshot,
      note: "Initial version",
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ data: template }, { status: 201 });
}
