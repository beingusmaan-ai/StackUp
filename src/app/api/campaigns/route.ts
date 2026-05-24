import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const campaignSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).default("DRAFT"),
  startDate: z.string(),
  endDate: z.string(),
  budget: z.number().optional().nullable(),
  goals: z.string().optional().nullable(),
  ownerId: z.string().optional(),
  departmentId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get("departmentId");

  const campaigns = await db.campaign.findMany({
    where: departmentId ? { departmentId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      department: { select: { id: true, name: true, color: true } },
      _count: { select: { tasks: true } },
      tasks: { select: { status: true } },
    },
  });

  const withProgress = campaigns.map((c) => ({
    ...c,
    completedTasks: c.tasks.filter((t) => t.status === "COMPLETED").length,
    progress:
      c.tasks.length > 0
        ? Math.round((c.tasks.filter((t) => t.status === "COMPLETED").length / c.tasks.length) * 100)
        : 0,
  }));

  return NextResponse.json({ data: withProgress });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "TEAM_MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = campaignSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const campaign = await db.campaign.create({
    data: {
      ...parsed.data,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      budget: parsed.data.budget ?? null,
      ownerId: parsed.data.ownerId || session.user.id,
      departmentId: parsed.data.departmentId ?? null,
    },
    include: {
      owner: { select: { id: true, name: true } },
      department: { select: { id: true, name: true, color: true } },
    },
  });

  return NextResponse.json({ data: campaign }, { status: 201 });
}
