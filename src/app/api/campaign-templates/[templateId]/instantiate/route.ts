import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  departmentId: z.string().optional().nullable(),
  ownerId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "TEAM_MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { templateId } = await params;
  const template = await db.campaignTemplate.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const campaign = await db.campaign.create({
    data: {
      name: parsed.data.name,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      departmentId: parsed.data.departmentId ?? template.departmentId,
      ownerId: parsed.data.ownerId ?? session.user.id,
      status: "DRAFT",
    },
  });

  if (template.templateTasks) {
    try {
      const tasks = JSON.parse(template.templateTasks) as {
        title: string;
        description?: string;
        taskType?: string;
        priority?: string;
        estimatedHours?: number;
      }[];

      for (let i = 0; i < tasks.length; i++) {
        await db.task.create({
          data: {
            title: tasks[i].title,
            description: tasks[i].description ?? null,
            taskType: tasks[i].taskType ?? null,
            priority: tasks[i].priority ?? "MEDIUM",
            estimatedHours: tasks[i].estimatedHours ?? null,
            position: i,
            campaignId: campaign.id,
            createdById: session.user.id,
          },
        });
      }
    } catch {
      // non-fatal — campaign was created, tasks just weren't seeded
    }
  }

  return NextResponse.json({ data: campaign }, { status: 201 });
}
