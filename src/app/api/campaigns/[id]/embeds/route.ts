import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const embeds = await db.embedView.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: embeds });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, url, icon } = await req.json();
  if (!name?.trim() || !url?.trim()) {
    return NextResponse.json({ error: "Name and URL are required" }, { status: 400 });
  }

  const embed = await db.embedView.create({
    data: { name: name.trim(), url: url.trim(), icon: icon ?? null, campaignId: id },
  });

  return NextResponse.json({ data: embed }, { status: 201 });
}
