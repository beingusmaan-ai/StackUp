import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { statusEmoji: true, statusMessage: true, statusExpiresAt: true },
  });

  return NextResponse.json({ data: user });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { emoji, message, expiresAt } = await req.json();

  const user = await db.user.update({
    where: { email: session.user.email },
    data: {
      statusEmoji: emoji || null,
      statusMessage: message || null,
      statusExpiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    select: { statusEmoji: true, statusMessage: true, statusExpiresAt: true },
  });

  return NextResponse.json({ data: user });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.user.update({
    where: { email: session.user.email },
    data: { statusEmoji: null, statusMessage: null, statusExpiresAt: null },
  });

  return NextResponse.json({ ok: true });
}
