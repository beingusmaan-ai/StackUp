import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, userId } = await params;

  await db.projectMember.deleteMany({
    where: { campaignId: id, userId },
  });

  return NextResponse.json({ ok: true });
}
