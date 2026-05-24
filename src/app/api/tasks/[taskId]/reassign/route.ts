import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  fromUserId: z.string().min(1),
  toUserId: z.string().min(1),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role === "TEAM_MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { taskId } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { fromUserId, toUserId } = parsed.data;

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    // Remove from source user
    await db.taskAssignee.deleteMany({ where: { taskId, userId: fromUserId } });

    // Add to target user if not already assigned
    const existing = await db.taskAssignee.findUnique({
      where: { taskId_userId: { taskId, userId: toUserId } },
    });
    if (!existing) {
      await db.taskAssignee.create({ data: { taskId, userId: toUserId } });
    }

    // Log activity (non-fatal)
    db.taskActivity.create({
      data: { taskId, actorId: session.user.id, action: "reassigned", fromValue: fromUserId, toValue: toUserId },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reassign] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
