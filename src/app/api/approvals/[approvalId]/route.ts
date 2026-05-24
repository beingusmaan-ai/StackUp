import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ approvalId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { approvalId } = await params;
  const { action, decisionNote } = await req.json();

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 422 });
  }

  const approval = await db.approvalRequest.findUnique({
    where: { id: approvalId },
    include: {
      task: { select: { id: true, title: true, createdById: true } },
      requester: { select: { id: true } },
    },
  });

  if (!approval) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the person who created/assigned the task can approve it
  if (approval.task.createdById !== session.user.id) {
    return NextResponse.json({ error: "Only the task assigner can approve this task" }, { status: 403 });
  }

  const newStatus = action === "approve" ? "APPROVED" : "REVISION_REQUIRED";
  const taskStatus = action === "approve" ? "COMPLETED" : "REVISION_REQUIRED";

  const [updated] = await Promise.all([
    db.approvalRequest.update({
      where: { id: approvalId },
      data: {
        status: newStatus,
        deciderId: session.user.id,
        decisionNote,
        decidedAt: new Date(),
      },
    }),
    db.task.update({
      where: { id: approval.taskId },
      data: {
        status: taskStatus,
        ...(action === "approve" && { completedAt: new Date(), approvedById: session.user.id }),
      },
    }),
    db.notification.create({
      data: {
        userId: approval.requester.id,
        type: "APPROVAL_DECIDED",
        title: action === "approve" ? "Task approved!" : "Revision requested",
        message: action === "approve"
          ? `Your task "${approval.task.title}" has been approved`
          : `"${approval.task.title}" needs revision: ${decisionNote || "No note provided"}`,
        taskId: approval.taskId,
      },
    }),
  ]);

  return NextResponse.json({ data: updated });
}
