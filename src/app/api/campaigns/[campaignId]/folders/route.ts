import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const folderSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().default("#6366f1"),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { campaignId } = await params;

  const folders = await db.projectFolder.findMany({
    where: { campaignId },
    orderBy: { position: "asc" },
    include: {
      lists: {
        orderBy: { position: "asc" },
        include: { _count: { select: { tasks: true } } },
      },
    },
  });

  return NextResponse.json({ data: folders });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "TEAM_MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { campaignId } = await params;

  const body = await req.json();
  const parsed = folderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  try {
    const count = await db.projectFolder.count({ where: { campaignId } });

    const folder = await db.projectFolder.create({
      data: { ...parsed.data, campaignId, position: count },
      include: { lists: true },
    });

    return NextResponse.json({ data: folder }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/campaigns/[campaignId]/folders] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
