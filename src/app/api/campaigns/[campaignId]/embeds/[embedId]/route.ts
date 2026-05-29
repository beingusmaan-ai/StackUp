import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ campaignId: string; embedId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId, embedId } = await params;

  const embed = await db.embedView.findFirst({
    where: { id: embedId, campaignId },
  });
  if (!embed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.embedView.delete({ where: { id: embedId } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ campaignId: string; embedId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { embedId } = await params;
  const { name, url, icon } = await req.json();

  const embed = await db.embedView.update({
    where: { id: embedId },
    data: { ...(name && { name }), ...(url && { url }), ...(icon !== undefined && { icon }) },
  });

  return NextResponse.json({ data: embed });
}
