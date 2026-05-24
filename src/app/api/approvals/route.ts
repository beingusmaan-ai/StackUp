import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where =
    session.user.role === "TEAM_MEMBER"
      ? { requesterId: session.user.id }
      : { status: "PENDING" as const };

  const approvals = await db.approvalRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      task: { select: { id: true, title: true, status: true } },
      requester: { select: { id: true, name: true, image: true } },
      decider: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: approvals });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId, message } = await req.json();
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 422 });

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { createdById: true, title: true },
  });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const [approval] = await Promise.all([
    db.approvalRequest.create({
      data: { taskId, requesterId: session.user.id, message },
      include: {
        task: { select: { id: true, title: true } },
        requester: { select: { id: true, name: true } },
      },
    }),
    db.task.update({
      where: { id: taskId },
      data: { status: "WAITING_APPROVAL" },
    }),
  ]);

  // Notify only the task creator (the person who assigned it)
  if (task.createdById !== session.user.id) {
    await db.notification.create({
      data: {
        userId: task.createdById,
        type: "APPROVAL_REQUESTED",
        title: "Approval requested",
        message: `${session.user.name} submitted "${approval.task.title}" for approval`,
        taskId,
      },
    });
  }

  return NextResponse.json({ data: approval }, { status: 201 });
}
