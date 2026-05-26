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

// GET — list all conversations for current user
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getDbUserId(session);

  const conversations = await db.conversation.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: {
        select: {
          userId: true,
          lastReadAt: true,
          user: { select: { id: true, name: true, image: true, marketingRole: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: { select: { name: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Attach unread count per conversation
  const withUnread = await Promise.all(
    conversations.map(async (conv) => {
      const member = conv.members.find((m) => m.userId === userId);
      const unread = member?.lastReadAt
        ? await db.message.count({
            where: { conversationId: conv.id, createdAt: { gt: member.lastReadAt }, senderId: { not: userId } },
          })
        : await db.message.count({
            where: { conversationId: conv.id, senderId: { not: userId } },
          });
      return { ...conv, unread };
    })
  );

  return NextResponse.json({ data: withUnread });
}

// POST — create DM or group conversation
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getDbUserId(session);
  const { type, memberIds, name, teamId } = await req.json();

  if (!type || !memberIds?.length) {
    return NextResponse.json({ error: "type and memberIds required" }, { status: 400 });
  }

  const allMemberIds: string[] = [...new Set([userId, ...memberIds])];

  // For DMs, check if conversation already exists
  if (type === "DIRECT" && allMemberIds.length === 2) {
    const existing = await db.conversation.findFirst({
      where: {
        type: "DIRECT",
        members: { every: { userId: { in: allMemberIds } } },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, image: true, marketingRole: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { name: true } } } },
      },
    });
    if (existing && existing.members.length === 2) {
      return NextResponse.json({ data: { ...existing, unread: 0 } });
    }
  }

  const conversation = await db.conversation.create({
    data: {
      type,
      name: name ?? null,
      teamId: teamId ?? null,
      members: {
        create: allMemberIds.map((uid) => ({ userId: uid })),
      },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, image: true, marketingRole: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { name: true } } } },
    },
  });

  return NextResponse.json({ data: { ...conversation, unread: 0 } }, { status: 201 });
}
