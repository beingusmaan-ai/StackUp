import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const deptSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  color: z.string().optional().default("#6366f1"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const myTeams = searchParams.get("myTeams") === "true";

  const where = myTeams
    ? { members: { some: { userId: session.user.id } } }
    : undefined;

  const departments = await db.department.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { members: true, campaigns: true } },
      campaigns: {
        where: { status: { not: "ARCHIVED" } },
        select: { id: true, name: true, status: true },
        orderBy: { name: "asc" },
      },
    },
  });

  return NextResponse.json({ data: departments });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "TEAM_MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = deptSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const dept = await db.department.create({
    data: parsed.data,
    include: { _count: { select: { members: true, campaigns: true } } },
  });

  return NextResponse.json({ data: dept }, { status: 201 });
}
