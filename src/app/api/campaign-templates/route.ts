import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  templateTasks: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get("departmentId");

  const templates = await db.campaignTemplate.findMany({
    where: departmentId ? { departmentId } : undefined,
    include: {
      createdBy: { select: { id: true, name: true } },
      department: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: templates });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "TEAM_MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = templateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const template = await db.campaignTemplate.create({
    data: { ...parsed.data, createdById: session.user.id },
    include: {
      createdBy: { select: { id: true, name: true } },
      department: { select: { id: true, name: true, color: true } },
    },
  });

  return NextResponse.json({ data: template }, { status: 201 });
}
