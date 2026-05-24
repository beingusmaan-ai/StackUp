import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(["ADMIN", "TEAM_LEAD", "TEAM_MEMBER"]).optional(),
  marketingRole: z.string().max(100).optional().nullable(),
  department: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  departmentIds: z.array(z.string()).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = await params;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, role: true, marketingRole: true,
      department: true, isActive: true, image: true, createdAt: true,
      departmentMemberships: {
        select: {
          departmentId: true,
          role: true,
          department: { select: { id: true, name: true, color: true } },
        },
      },
      assignedTasks: {
        include: {
          task: {
            select: { id: true, title: true, status: true, priority: true, dueDate: true },
          },
        },
        orderBy: { assignedAt: "desc" },
        take: 20,
      },
      _count: { select: { assignedTasks: true, taskComments: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: user });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = await params;

  const canEdit = session.user.role === "ADMIN" || session.user.id === userId;
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  if (parsed.data.role && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can change roles" }, { status: 403 });
  }

  const { departmentIds, ...userData } = parsed.data;

  const user = await db.user.update({
    where: { id: userId },
    data: userData,
    select: { id: true, name: true, email: true, role: true, marketingRole: true, isActive: true },
  });

  // Sync department memberships if provided
  if (departmentIds !== undefined) {
    await db.departmentMember.deleteMany({ where: { userId } });
    if (departmentIds.length > 0) {
      await db.departmentMember.createMany({
        data: departmentIds.map((departmentId) => ({ userId, departmentId, role: "MEMBER" })),
      });
    }
  }

  return NextResponse.json({ data: user });
}
