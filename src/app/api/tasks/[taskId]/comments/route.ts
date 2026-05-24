import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { taskId } = await params;

  const comments = await db.taskComment.findMany({
    where: { taskId },
    include: { author: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: comments });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { taskId } = await params;

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 422 });

  const comment = await db.taskComment.create({
    data: { taskId, authorId: session.user.id, content },
    include: { author: { select: { id: true, name: true, image: true } } },
  });

  await db.taskActivity.create({
    data: { taskId, actorId: session.user.id, action: "commented" },
  });

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { assignees: { select: { userId: true } } },
  });

  if (task) {
    const notifyUsers = [
      task.createdById,
      ...task.assignees.map((a) => a.userId),
    ].filter((uid) => uid !== session.user.id);

    if (notifyUsers.length > 0) {
      await db.notification.createMany({
        data: notifyUsers.map((uid) => ({
          userId: uid,
          type: "TASK_COMMENT" as const,
          title: "New comment",
          message: `${session.user.name} commented on "${task.title}"`,
          taskId,
        })),
      });
    }
  }

  return NextResponse.json({ data: comment }, { status: 201 });
}
