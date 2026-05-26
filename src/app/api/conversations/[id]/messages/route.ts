import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";

async function getDbUserId(session: { user: { id: string; email?: string | null } }) {
  if (session.user.email) {
    const me = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (me) return me.id;
  }
  return session.user.id;
}

// GET — fetch messages for a conversation
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = await getDbUserId(session);

  const isMember = await db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: id, userId } },
  });
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");

  const messages = await db.message.findMany({
    where: { conversationId: id },
    include: { sender: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
    take: 50,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  // Mark as read
  await db.conversationMember.update({
    where: { conversationId_userId: { conversationId: id, userId } },
    data: { lastReadAt: new Date() },
  });

  return NextResponse.json({ data: messages });
}

// POST — send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = await getDbUserId(session);

  const isMember = await db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: id, userId } },
  });
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const message = await db.message.create({
    data: { conversationId: id, senderId: userId, content: content.trim() },
    include: { sender: { select: { id: true, name: true, image: true } } },
  });

  // Update conversation updatedAt
  await db.conversation.update({ where: { id }, data: { updatedAt: new Date() } });

  // Push real-time event
  await pusherServer.trigger(`conversation-${id}`, "new-message", message);

  return NextResponse.json({ data: message }, { status: 201 });
}
