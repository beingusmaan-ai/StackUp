import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { computeNextRunDate, Frequency, EndType } from "@/lib/recurring";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await db.recurringTemplate.findMany({
    where: session.user.role === "TEAM_MEMBER" ? { createdById: session.user.id } : undefined,
    include: {
      createdBy: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: templates });
}

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  taskType: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  estimatedHours: z.number().optional().nullable(),
  campaignId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional().default([]),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  interval: z.number().min(1).default(1),
  weekDays: z.string().optional().nullable(),
  monthDay: z.number().min(1).max(31).optional().nullable(),
  startDate: z.string().min(1),
  endType: z.enum(["NEVER", "ON_DATE", "AFTER_COUNT"]).default("NEVER"),
  endDate: z.string().optional().nullable(),
  endCount: z.number().min(1).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const d = parsed.data;
  const startDate = new Date(d.startDate);

  const template = await db.recurringTemplate.create({
    data: {
      title: d.title,
      description: d.description ?? null,
      taskType: d.taskType ?? null,
      priority: d.priority,
      estimatedHours: d.estimatedHours ?? null,
      campaignId: d.campaignId ?? null,
      assigneeIds: d.assigneeIds.length > 0 ? d.assigneeIds.join(",") : null,
      createdById: session.user.id,
      frequency: d.frequency,
      interval: d.interval,
      weekDays: d.frequency === "WEEKLY" ? (d.weekDays ?? "1") : null,
      monthDay: d.frequency === "MONTHLY" ? (d.monthDay ?? 1) : null,
      startDate,
      endType: d.endType,
      endDate: d.endType === "ON_DATE" && d.endDate ? new Date(d.endDate) : null,
      endCount: d.endType === "AFTER_COUNT" ? d.endCount : null,
      nextRunAt: startDate,
    },
  });

  return NextResponse.json({ data: template }, { status: 201 });
}
