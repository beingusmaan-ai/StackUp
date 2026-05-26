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
  workspaceId: z.string().optional().nullable(),
});

async function getUserAllowedDeptIds(session: { user: { id: string; email?: string | null; role?: string | null } }): Promise<string[] | null> {
  if (session.user.role === "ADMIN") return null; // null = no restriction
  let dbUserId = session.user.id;
  if (session.user.email) {
    const me = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (me) dbUserId = me.id;
  }
  const memberships = await db.departmentMember.findMany({
    where: { userId: dbUserId },
    select: { departmentId: true },
  });
  return memberships.map((m) => m.departmentId);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get("departmentId");
  const workspaceId = searchParams.get("workspaceId");
  const picker = searchParams.get("picker") === "1";
  const sidebar = searchParams.get("sidebar") === "1";

  let allowedDeptIds = await getUserAllowedDeptIds(session);

  // In sidebar mode, restrict admin users to their own department memberships.
  // Admins with no memberships fall back to seeing all (null = no restriction).
  if (sidebar && allowedDeptIds === null) {
    let dbUserId = session.user.id;
    if (session.user.email) {
      const me = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      if (me) dbUserId = me.id;
    }
    const memberships = await db.departmentMember.findMany({
      where: { userId: dbUserId },
      select: { departmentId: true },
    });
    if (memberships.length > 0) {
      allowedDeptIds = memberships.map((m) => m.departmentId);
    }
  }

  const where: Record<string, unknown> = {};
  if (workspaceId) where.workspaceId = workspaceId;

  if (!picker) {
    if (allowedDeptIds !== null) {
      // Non-admin (or admin in sidebar mode): restrict to their departments
      const effectiveDeptIds =
        departmentId && allowedDeptIds.includes(departmentId) ? [departmentId] : allowedDeptIds;
      where.departmentId = { in: effectiveDeptIds };
    } else if (departmentId) {
      where.departmentId = departmentId;
    }
  } else if (departmentId) {
    where.departmentId = departmentId;
  }

  const campaigns = await db.campaign.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      department: { select: { id: true, name: true, color: true } },
      workspace: { select: { id: true, name: true, color: true } },
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

async function resolveUserId(session: { user: { id: string; email?: string | null } }): Promise<string | null> {
  let user = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  if (!user && session.user.email) {
    user = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  }
  return user?.id ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = await resolveUserId(session);
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isGlobalAdmin = session.user.role === "ADMIN";

    // Resolve dept admin memberships for non-global-admins
    let callerAdminDeptIds: string[] = [];
    if (!isGlobalAdmin) {
      const adminRows = await db.departmentMember.findMany({
        where: { userId, role: "ADMIN" },
        select: { departmentId: true },
      });
      callerAdminDeptIds = adminRows.map((r) => r.departmentId);
      if (callerAdminDeptIds.length === 0) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json();
    const parsed = campaignSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    // Validate foreign keys exist before inserting
    let resolvedDeptId: string | null = null;
    if (parsed.data.departmentId) {
      const dept = await db.department.findUnique({ where: { id: parsed.data.departmentId }, select: { id: true } });
      // Non-global-admins can only create projects in their own departments
      if (dept && (isGlobalAdmin || callerAdminDeptIds.includes(dept.id))) {
        resolvedDeptId = dept.id;
      } else if (!isGlobalAdmin) {
        return NextResponse.json({ error: "You can only create projects in your own department" }, { status: 403 });
      }
    } else if (!isGlobalAdmin) {
      // Dept admin must specify a department
      return NextResponse.json({ error: "Department is required" }, { status: 422 });
    }
    let resolvedOwnerId = userId;
    if (parsed.data.ownerId) {
      const owner = await db.user.findUnique({ where: { id: parsed.data.ownerId }, select: { id: true } });
      resolvedOwnerId = owner?.id ?? userId;
    }

    const campaign = await db.campaign.create({
      data: {
        ...parsed.data,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        budget: parsed.data.budget ?? null,
        ownerId: resolvedOwnerId,
        departmentId: resolvedDeptId,
        workspaceId: parsed.data.workspaceId ?? null,
      },
      include: {
        owner: { select: { id: true, name: true } },
        department: { select: { id: true, name: true, color: true } },
        workspace: { select: { id: true, name: true, color: true } },
      },
    });

    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/campaigns]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
