import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const customTaskSchema = z.object({
  title: z.string().min(1),
  assignedRole: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  estimatedHours: z.number().optional().nullable(),
  dayOffset: z.number().optional().nullable(),
});

const customGroupSchema = z.object({
  name: z.string(),
  tasks: z.array(customTaskSchema),
});

const generateSchema = z.object({
  // Use existing campaign OR create new
  campaignId: z.string().optional().nullable(),
  createCampaign: z.boolean().default(false),
  campaignName: z.string().optional().nullable(),
  campaignDepartmentId: z.string().optional().nullable(),
  // Deadline drives smart date generation
  deadline: z.string(),
  // Map role -> userId for auto-assignment. Key is marketingRole enum value.
  roleAssignments: z.record(z.string(), z.string()).default({}),
  // Manual per-task assignee override (templateTaskId -> userId)
  taskAssignments: z.record(z.string(), z.string()).default({}),
  // If provided, use these groups/tasks instead of the template's stored tasks
  customGroups: z.array(customGroupSchema).optional().nullable(),
});

function smartDueDate(
  deadline: Date,
  taskIndex: number,
  totalTasks: number,
  estimatedDays: number | null,
  dayOffset: number | null
): Date {
  const d = new Date(deadline);
  if (dayOffset != null) {
    d.setDate(d.getDate() - dayOffset);
    return d;
  }
  // Distribute evenly across estimatedDays (or totalTasks * 2 days by default)
  const span = estimatedDays ?? Math.max(totalTasks * 2, 7);
  const daysBack = Math.round(((totalTasks - 1 - taskIndex) / Math.max(totalTasks - 1, 1)) * span);
  d.setDate(d.getDate() - daysBack);
  return d;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { templateId } = await params;
  const body = await req.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const {
    campaignId: existingCampaignId,
    createCampaign,
    campaignName,
    campaignDepartmentId,
    deadline,
    roleAssignments,
    taskAssignments,
    customGroups,
  } = parsed.data;

  // Load template
  const template = await db.taskTemplate.findUnique({
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

  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const deadlineDate = new Date(deadline);

  // Resolve campaign
  let campaignId = existingCampaignId ?? null;
  if (createCampaign && campaignName) {
    const newCampaign = await db.campaign.create({
      data: {
        name: campaignName,
        status: "DRAFT",
        startDate: new Date(),
        endDate: deadlineDate,
        ownerId: session.user.id,
        departmentId: campaignDepartmentId ?? null,
      },
    });
    campaignId = newCampaign.id;
  }

  type ActiveTask = {
    id: string;
    title: string;
    description: string | null;
    taskType: string | null;
    assignedRole: string | null;
    priority: string;
    estimatedHours: number | null;
    dayOffset: number | null;
    checklist: { text: string }[];
  };
  type ActiveGroup = { name: string; tasks: ActiveTask[] };

  // Use customGroups (user-edited) if provided, otherwise fall back to stored template groups
  const activeGroups: ActiveGroup[] = customGroups && customGroups.length > 0
    ? customGroups.map((g) => ({
        name: g.name,
        tasks: g.tasks.map((t, i) => ({
          id: `custom-${i}`,
          title: t.title,
          description: null,
          taskType: null,
          assignedRole: t.assignedRole ?? null,
          priority: t.priority,
          estimatedHours: t.estimatedHours ?? null,
          dayOffset: t.dayOffset ?? null,
          checklist: [],
        })),
      }))
    : template.groups.map((g) => ({
        name: g.name,
        tasks: g.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          taskType: t.taskType,
          assignedRole: t.assignedRole,
          priority: t.priority,
          estimatedHours: t.estimatedHours,
          dayOffset: t.dayOffset,
          checklist: t.checklist,
        })),
      }));

  // Flatten all tasks ordered by group position then task position
  const allTemplateTasks = activeGroups.flatMap((g) => g.tasks);
  const totalTasks = allTemplateTasks.length;

  // Fetch users for role-based assignment
  const usersWithRoles = await db.user.findMany({
    where: { isActive: true, marketingRole: { not: null } },
    select: { id: true, marketingRole: true },
  });
  const roleToUserId: Record<string, string> = {};
  usersWithRoles.forEach((u) => {
    if (u.marketingRole && !roleToUserId[u.marketingRole]) {
      roleToUserId[u.marketingRole] = u.id;
    }
  });
  // Explicit role assignments override auto-detection
  Object.assign(roleToUserId, roleAssignments);

  // Generate tasks
  const createdTasks: { id: string; templateTaskId: string }[] = [];
  let globalIndex = 0;

  for (const group of activeGroups) {
    for (const tmplTask of group.tasks) {
      const dueDate = smartDueDate(
        deadlineDate,
        globalIndex,
        totalTasks,
        template.estimatedDays,
        tmplTask.dayOffset
      );

      // Resolve assignee: explicit task override > role mapping
      const assigneeId: string | null =
        taskAssignments[tmplTask.id] ??
        (tmplTask.assignedRole ? roleToUserId[tmplTask.assignedRole] ?? null : null);

      const task = await db.task.create({
        data: {
          title: tmplTask.title,
          description: tmplTask.description ?? null,
          taskType: tmplTask.taskType ?? null,
          priority: tmplTask.priority,
          status: assigneeId ? "ASSIGNED" : "TODO",
          dueDate,
          estimatedHours: tmplTask.estimatedHours ?? null,
          campaignId,
          createdById: session.user.id,
          assignees: assigneeId
            ? { create: [{ user: { connect: { id: assigneeId } } }] }
            : undefined,
          checklist: tmplTask.checklist.length > 0
            ? {
                create: tmplTask.checklist.map((c, ci) => ({
                  text: c.text,
                  position: ci,
                  isChecked: false,
                })),
              }
            : undefined,
        },
      });

      createdTasks.push({ id: task.id, templateTaskId: tmplTask.id });

      // Send assignment notification
      if (assigneeId) {
        db.notification.create({
          data: {
            userId: assigneeId,
            type: "TASK_ASSIGNED",
            title: "New task assigned",
            message: `You have been assigned: ${task.title}`,
            taskId: task.id,
          },
        }).catch(() => {});
      }

      globalIndex++;
    }
  }

  // Update template usage stats
  await db.taskTemplate.update({
    where: { id: templateId },
    data: { lastUsedAt: new Date(), useCount: { increment: 1 } },
  });

  return NextResponse.json({
    data: {
      campaignId,
      tasksCreated: createdTasks.length,
      tasks: createdTasks,
    },
  }, { status: 201 });
}
