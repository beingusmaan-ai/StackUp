import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; embedId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const embed = await db.embedView.findFirst({
    where: { id: params.embedId, campaignId: params.id },
  });
  if (!embed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.embedView.delete({ where: { id: params.embedId } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; embedId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, url, icon } = await req.json();

  const embed = await db.embedView.update({
    where: { id: params.embedId },
    data: { ...(name && { name }), ...(url && { url }), ...(icon !== undefined && { icon }) },
  });

  return NextResponse.json({ data: embed });
}
