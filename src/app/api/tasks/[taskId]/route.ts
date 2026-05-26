import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { getCallerDeptAdminIds } from "@/lib/dept-auth";
import { notifyStatusChange, notifyAssignment } from "@/lib/slack";
import { notifyStatusChange as emailStatusChange, notifyAssignment as emailAssignment } from "@/lib/email";

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  taskType: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TODO", "ASSIGNED", "IN_PROGRESS", "WAITING_APPROVAL", "REVISION_REQUIRED", "COMPLETED", "BLOCKED"]).optional(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  estimatedHours: z.number().optional().nullable(),
  campaignId: z.string().optional().nullable(),
  listId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
  requestingDepartmentId: z.string().optional().nullable(),
  assignedDepartmentId: z.string().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      assignees: { include: { user: { select: { id: true, name: true, image: true, marketingRole: true } } } },
      comments: {
        where: { parentId: null },
        include: {
          author: { select: { id: true, name: true, image: true } },
          replies: {
            include: { author: { select: { id: true, name: true, image: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      attachments: true,
      activityLog: {
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      createdBy: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true, departmentId: true } },
      list: { select: { id: true, name: true, folder: { select: { id: true, name: true } } } },
      requestingDepartment: { select: { id: true, name: true, color: true } },
      assignedDepartment: { select: { id: true, name: true, color: true } },
      subTasks: {
        include: { assignees: { include: { user: { select: { id: true, name: true } } } } },
      },
      approvalRequests: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          requester: { select: { id: true, name: true } },
          decider: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: task });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const body = await req.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { assigneeIds, startDate, dueDate, status, ...rest } = parsed.data;

  const existing = await db.task.findUnique({ where: { id: taskId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const updateData: Record<string, unknown> = {
      ...rest,
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(status && { status }),
      ...(status === "COMPLETED" && { completedAt: new Date() }),
    };

    if (assigneeIds !== undefined) {
      await db.taskAssignee.deleteMany({ where: { taskId } });
      if (assigneeIds.length > 0) {
        updateData.assignees = { create: assigneeIds.map((uid) => ({ userId: uid })) };
      }
    }

    const task = await db.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignees: { include: { user: { select: { id: true, name: true, image: true, email: true } } } },
        campaign: { select: { id: true, name: true } },
      },
    });

    if (status && status !== existing.status) {
      await db.taskActivity.create({
        data: {
          taskId,
          actorId: session.user.id,
          action: "status_changed",
          fromValue: existing.status,
          toValue: status,
        },
      });

      if (existing.createdById !== session.user.id) {
        await db.notification.create({
          data: {
            userId: existing.createdById,
            type: "TASK_STATUS_CHANGED",
            title: "Task status updated",
            message: `"${task.title}" moved to ${status.replace(/_/g, " ")}`,
            taskId,
          },
        });
      }

      notifyStatusChange({
        taskTitle: task.title,
        taskId,
        fromStatus: existing.status,
        toStatus: status,
        actorName: session.user.name ?? "Someone",
        campaignName: task.campaign?.name,
      }).catch(() => {});

      emailStatusChange({
        taskTitle: task.title,
        taskId,
        fromStatus: existing.status,
        toStatus: status,
        actorName: session.user.name ?? "Someone",
        campaignName: task.campaign?.name,
      }).catch(() => {});
    }

    if (assigneeIds !== undefined && assigneeIds.length > 0) {
      for (const assignee of task.assignees) {
        notifyAssignment({
          taskTitle: task.title,
          taskId,
          assigneeName: assignee.user.name ?? "Someone",
          assignerName: session.user.name ?? "Someone",
          dueDate: task.dueDate,
        }).catch(() => {});

        emailAssignment({
          taskTitle: task.title,
          taskId,
          assigneeName: assignee.user.name ?? "Someone",
          assigneeEmail: assignee.user.email,
          assignerName: session.user.name ?? "Someone",
          dueDate: task.dueDate,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ data: task });
  } catch (err) {
    console.error("[PATCH /api/tasks/:id] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;

  const deptAdminIds = await getCallerDeptAdminIds(session);
  if (deptAdminIds !== null) {
    if (deptAdminIds.length === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { campaign: { select: { departmentId: true } } },
    });
    const deptId = task?.campaign?.departmentId;
    if (!deptId || !deptAdminIds.includes(deptId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await db.task.delete({ where: { id: taskId } });
  return NextResponse.json({ success: true });
}
