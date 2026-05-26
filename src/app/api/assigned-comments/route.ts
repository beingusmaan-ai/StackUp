import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getDbUserId(session: { user: { id: string; email?: string | null } }) {
  if (session.user.email) {
    const me = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (me) return me.id;
  }
  return session.user.id;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getDbUserId(session);
  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") || "assigned";        // assigned | delegated
  const resolved = searchParams.get("resolved") === "true"; // include completed tasks
  const days = parseInt(searchParams.get("days") || "90", 10);
  const sinceParam = searchParams.get("since");             // ISO date for unread count
  const countOnly = searchParams.get("count") === "true";

  const since = sinceParam ? new Date(sinceParam) : new Date();
  if (!sinceParam) since.setDate(since.getDate() - days);

  const taskStatusFilter = resolved
    ? undefined
    : { status: { not: "COMPLETED" } };

  const baseWhere = {
    parentId: null,
    createdAt: { gte: since },
    authorId: { not: userId }, // exclude own comments
    task: {
      ...taskStatusFilter,
      ...(tab === "assigned"
        ? { assignees: { some: { userId } } }
        : { createdById: userId }),
    },
  };

  if (countOnly) {
    const count = await db.taskComment.count({ where: baseWhere });
    return NextResponse.json({ count });
  }

  const comments = await db.taskComment.findMany({
    where: baseWhere,
    include: {
      author: { select: { id: true, name: true, image: true } },
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          campaign: { select: { name: true } },
          assignees: { include: { user: { select: { id: true, name: true, image: true } } } },
        },
      },
      replies: {
        include: { author: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ data: comments });
}
