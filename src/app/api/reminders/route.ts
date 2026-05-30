import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getDbUserId(email: string) {
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  return user?.id ?? null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getDbUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const reminders = await db.reminder.findMany({
    where: { userId, isCompleted: false },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    select: { id: true, title: true, description: true, dueDate: true, notifyMe: true, isCompleted: true, createdAt: true },
  });

  return NextResponse.json({ data: reminders });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getDbUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { title, description, dueDate, notifyMe } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 422 });

  const reminder = await db.reminder.create({
    data: {
      userId,
      title: title.trim(),
      description: description?.trim() || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      notifyMe: notifyMe ?? true,
    },
    select: { id: true, title: true, description: true, dueDate: true, notifyMe: true, isCompleted: true, createdAt: true },
  });

  return NextResponse.json({ data: reminder }, { status: 201 });
}
