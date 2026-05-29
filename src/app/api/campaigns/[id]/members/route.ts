import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const members = await db.projectMember.findMany({
    where: { campaignId: id },
    include: { user: { select: { id: true, name: true, image: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: members });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { userId, role = "MEMBER" } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const member = await db.projectMember.upsert({
    where: { campaignId_userId: { campaignId: id, userId } },
    update: { role },
    create: { campaignId: id, userId, role },
    include: { user: { select: { id: true, name: true, image: true, email: true } } },
  });

  return NextResponse.json({ data: member }, { status: 201 });
}
