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

  const since = new Date();
  since.setDate(since.getDate() - days);

  const taskStatusFilter = resolved
    ? undefined
    : { status: { not: "COMPLETED" } };

  const comments = await db.taskComment.findMany({
    where: {
      parentId: null, // top-level only
      createdAt: { gte: since },
      task: {
        ...taskStatusFilter,
        ...(tab === "assigned"
          ? { assignees: { some: { userId } } }
          : { createdById: userId }),
      },
    },
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
