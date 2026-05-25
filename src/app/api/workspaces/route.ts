import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().optional(),
  color: z.string().optional(),
});

async function uniqueSlug(base: string): Promise<string> {
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const existing = await db.workspace.findMany({
    where: { slug: { startsWith: slug } },
    select: { slug: true },
  });
  if (!existing.find((w) => w.slug === slug)) return slug;
  let i = 2;
  while (existing.find((w) => w.slug === `${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}

async function resolveUserId(session: { user: { id: string; email?: string | null } }): Promise<string | null> {
  let user = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  if (!user && session.user.email) {
    user = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  }
  return user?.id ?? null;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = await resolveUserId(session);
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const workspaces = await db.workspace.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { campaigns: true, members: true } },
      },
    });

    return NextResponse.json({ data: workspaces });
  } catch (err) {
    console.error("[GET /api/workspaces]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = await resolveUserId(session);
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const slug = await uniqueSlug(parsed.data.name);

    const workspace = await db.workspace.create({
      data: {
        name: parsed.data.name,
        slug,
        description: parsed.data.description ?? null,
        color: parsed.data.color ?? "#e8170b",
        members: {
          create: { userId, role: "OWNER" },
        },
      },
      include: { _count: { select: { campaigns: true, members: true } } },
    });

    return NextResponse.json({ data: workspace }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/workspaces]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
