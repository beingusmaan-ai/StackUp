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
  const picker = searchParams.get("picker") === "1";

  // Resolve caller's real DB user ID
  const isGlobalAdmin = session.user.role === "ADMIN";
  let callerDbId = session.user.id;
  if (session.user.email) {
    const me = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (me) callerDbId = me.id;
  }

  // Resolve caller's department memberships (used for scoping)
  const callerMemberships = await db.departmentMember.findMany({
    where: { userId: callerDbId },
    select: { departmentId: true },
  });
  const callerDeptIds = callerMemberships.map((m) => m.departmentId);

  const where: Record<string, unknown> = { parentTaskId: null };

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (campaignId) where.campaignId = campaignId;
  if (assigneeId) where.assignees = { some: { userId: assigneeId } };
  if (search) where.title = { contains: search };

  // Scope to a specific team's tasks — non-admins must be a member of that team
  if (teamId && tab !== "incoming" && tab !== "outgoing") {
    const callerIsInTeam = isGlobalAdmin || callerDeptIds.includes(teamId);
    if (callerIsInTeam) {
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
    } else {
      // User is not a member of the requested team — return empty
      return NextResponse.json({ data: [] });
    }
  }

  if (tab === "incoming" || tab === "outgoing") {
    if (callerDeptIds.length > 0) {
      if (tab === "incoming") {
        where.assignedDepartmentId = { in: callerDeptIds };
        where.requestingDepartmentId = { notIn: callerDeptIds };
      } else {
        where.requestingDepartmentId = { in: callerDeptIds };
        where.NOT = { assignedDepartmentId: { in: callerDeptIds } };
        where.assignedDepartmentId = { not: null };
      }
    } else {
      return NextResponse.json({ data: [] });
    }
  } else if (!isGlobalAdmin && !teamId && !picker) {
    // Non-admin with no team filter: scope to tasks in their departments or assigned to them
    if (callerDeptIds.length > 0) {
      where.OR = [
        { assignedDepartmentId: { in: callerDeptIds } },
        { requestingDepartmentId: { in: callerDeptIds } },
        { assignees: { some: { userId: callerDbId } } },
      ];
    } else {
      where.assignees = { some: { userId: callerDbId } };
    }
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

  // Resolve createdById — fall back to email lookup if JWT id is stale
  let createdById = session.user.id;
  const creatorCheck = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  if (!creatorCheck && session.user.email) {
    const byEmail = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (byEmail) createdById = byEmail.id;
  }

  // Validate department IDs exist before using them
  const resolvedReqDeptId = requestingDepartmentId
    ? (await db.department.findUnique({ where: { id: requestingDepartmentId }, select: { id: true } }))?.id ?? null
    : null;
  const resolvedAssignedDeptId = assignedDepartmentId
    ? (await db.department.findUnique({ where: { id: assignedDepartmentId }, select: { id: true } }))?.id ?? null
    : null;

  // Validate assignee IDs exist
  const validAssigneeIds: string[] = [];
  for (const uid of assigneeIds) {
    const exists = await db.user.findUnique({ where: { id: uid }, select: { id: true } });
    if (exists) validAssigneeIds.push(uid);
  }

  // If task is assigned to a team but no specific person chosen,
  // auto-assign to that department's LEAD/ADMIN members.
  let finalAssigneeIds = [...validAssigneeIds];
  if (resolvedAssignedDeptId && finalAssigneeIds.length === 0) {
    const leads = await db.departmentMember.findMany({
      where: { departmentId: resolvedAssignedDeptId, role: { in: ["LEAD", "ADMIN"] } },
      select: { userId: true },
    });
    if (leads.length > 0) {
      finalAssigneeIds = leads.map((m) => m.userId);
    } else {
      const anyMember = await db.departmentMember.findFirst({
        where: { departmentId: resolvedAssignedDeptId },
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
        createdById,
        requestingDepartmentId: resolvedReqDeptId,
        assignedDepartmentId: resolvedAssignedDeptId,
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
      data: { taskId: task.id, actorId: createdById, action: "created" },
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
