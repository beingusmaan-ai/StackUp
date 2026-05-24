import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  taskType: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["TODO", "ASSIGNED", "IN_PROGRESS", "WAITING_APPROVAL", "REVISION_REQUIRED", "COMPLETED", "BLOCKED"]).default("TODO"),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  estimatedHours: z.number().optional().nullable(),
  campaignId: z.string().optional().nullable(),
  listId: z.string().optional().nullable(),
  parentTaskId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).default([]),
  requestingDepartmentId: z.string().optional().nullable(),
  assignedDepartmentId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const campaignId = searchParams.get("campaignId");
  const assigneeId = searchParams.get("assigneeId");
  const search = searchParams.get("search");
  const tab = searchParams.get("tab"); // "incoming" | "outgoing"
  const teamId = searchParams.get("teamId"); // active team context

  const where: Record<string, unknown> = { parentTaskId: null };

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (campaignId) where.campaignId = campaignId;
  if (assigneeId) where.assignees = { some: { userId: assigneeId } };
  if (search) where.title = { contains: search };

  // Scope to a specific team's tasks
  if (teamId && tab !== "incoming" && tab !== "outgoing") {
    const teamMemberIds = await db.departmentMember.findMany({
      where: { departmentId: teamId },
      select: { userId: true },
    });
    const memberIds = teamMemberIds.map((m) => m.userId);
    where.OR = [
      { assignedDepartmentId: teamId },
      { requestingDepartmentId: teamId },
      { assignees: { some: { userId: { in: memberIds } } } },
      { createdById: { in: memberIds } },
    ];
  }

  if (tab === "incoming" || tab === "outgoing") {
    const memberships = await db.departmentMember.findMany({
      where: { userId: session.user.id },
      select: { departmentId: true },
    });
    const myDeptIds = memberships.map((m) => m.departmentId);

    if (myDeptIds.length > 0) {
      if (tab === "incoming") {
        where.assignedDepartmentId = { in: myDeptIds };
        where.requestingDepartmentId = { notIn: myDeptIds };
      } else {
        where.requestingDepartmentId = { in: myDeptIds };
        where.NOT = { assignedDepartmentId: { in: myDeptIds } };
        where.assignedDepartmentId = { not: null };
      }
    } else {
      // User has no department — return empty for these tabs
      return NextResponse.json({ data: [] });
    }
  } else if (session.user.role === "TEAM_MEMBER") {
    where.assignees = { some: { userId: session.user.id } };
  }

  const tasks = await db.task.findMany({
    where,
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      assignees: { include: { user: { select: { id: true, name: true, image: true, marketingRole: true } } } },
      createdBy: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
      requestingDepartment: { select: { id: true, name: true, color: true } },
      assignedDepartment: { select: { id: true, name: true, color: true } },
      _count: { select: { comments: true, subTasks: true, attachments: true } },
    },
  });

  return NextResponse.json({ data: tasks });
}

export async function POST(req: NextRequest) {
  console.log("[POST /api/tasks] received");
  const session = await auth();
  if (!session) {
    console.log("[POST /api/tasks] no session");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the session user still exists in the database (catches stale JWT after re-seed)
  const sessionUser = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  if (!sessionUser) {
    console.log("[POST /api/tasks] session user not found:", session.user.id);
    return NextResponse.json(
      { error: "Session expired — please sign out and sign back in." },
      { status: 401 }
    );
  }

  const body = await req.json();
  console.log("[POST /api/tasks] body:", JSON.stringify(body));
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    console.log("[POST /api/tasks] validation failed:", JSON.stringify(parsed.error.flatten()));
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { assigneeIds, startDate, dueDate, requestingDepartmentId, assignedDepartmentId, ...rest } = parsed.data;

  // If task is assigned to a team but no specific person chosen,
  // auto-assign to that department's LEAD/ADMIN members.
  let finalAssigneeIds = [...assigneeIds];
  if (assignedDepartmentId && finalAssigneeIds.length === 0) {
    const leads = await db.departmentMember.findMany({
      where: {
        departmentId: assignedDepartmentId,
        role: { in: ["LEAD", "ADMIN"] },
      },
      select: { userId: true },
    });
    if (leads.length > 0) {
      finalAssigneeIds = leads.map((m) => m.userId);
    } else {
      // Fall back to any member of the department
      const anyMember = await db.departmentMember.findFirst({
        where: { departmentId: assignedDepartmentId },
        select: { userId: true },
      });
      if (anyMember) finalAssigneeIds = [anyMember.userId];
    }
  }

  try {
    const task = await db.task.create({
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: session.user.id,
        requestingDepartmentId: requestingDepartmentId ?? null,
        assignedDepartmentId: assignedDepartmentId ?? null,
        status: (finalAssigneeIds.length > 0 || assignedDepartmentId) ? "ASSIGNED" : "TODO",
        assignees: finalAssigneeIds.length > 0 ? {
          create: finalAssigneeIds.map((userId) => ({ userId })),
        } : undefined,
      },
      include: {
        assignees: { include: { user: { select: { id: true, name: true, image: true } } } },
        createdBy: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
    });

    await db.taskActivity.create({
      data: { taskId: task.id, actorId: session.user.id, action: "created" },
    });

    if (finalAssigneeIds.length > 0) {
      const isCrossTeam = !!assignedDepartmentId && assigneeIds.length === 0;
      db.notification.createMany({
        data: finalAssigneeIds.map((uid) => ({
          userId: uid,
          type: "TASK_ASSIGNED",
          title: isCrossTeam ? "New cross-team task assigned" : "New task assigned",
          message: isCrossTeam
            ? `A task has been sent to your team: ${task.title}`
            : `You have been assigned: ${task.title}`,
          taskId: task.id,
        })),
      }).catch((e) => console.error("Notification create failed (non-fatal):", e));
    }

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/tasks] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
