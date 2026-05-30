import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mutedUntil } = await req.json();

  await db.user.update({
    where: { email: session.user.email },
    data: { notificationsMutedUntil: mutedUntil ? new Date(mutedUntil) : null },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.user.update({
    where: { email: session.user.email },
    data: { notificationsMutedUntil: null },
  });

  return NextResponse.json({ ok: true });
}
