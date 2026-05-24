import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().optional().nullable(),
  goals: z.string().optional().nullable(),
  ownerId: z.string().optional(),
  departmentId: z.string().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { campaignId } = await params;

  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      department: { select: { id: true, name: true, color: true } },
      tasks: {
        include: {
          assignees: { include: { user: { select: { id: true, name: true, image: true } } } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const completedTasks = campaign.tasks.filter((t) => t.status === "COMPLETED").length;
  const progress = campaign.tasks.length > 0
    ? Math.round((completedTasks / campaign.tasks.length) * 100)
    : 0;

  return NextResponse.json({ data: { ...campaign, completedTasks, progress } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "TEAM_MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { campaignId } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { startDate, endDate, ...rest } = parsed.data;

  const campaign = await db.campaign.update({
    where: { id: campaignId },
    data: {
      ...rest,
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
    },
    include: {
      owner: { select: { id: true, name: true } },
      department: { select: { id: true, name: true, color: true } },
    },
  });

  return NextResponse.json({ data: campaign });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { campaignId } = await params;
  await db.campaign.delete({ where: { id: campaignId } });
  return NextResponse.json({ success: true });
}
