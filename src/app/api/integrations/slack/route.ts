import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  webhookUrl:      z.string().url(),
  channel:         z.string().optional().nullable(),
  enabled:         z.boolean().optional(),
  notifyOnStatus:  z.boolean().optional(),
  notifyOnAssign:  z.boolean().optional(),
  notifyOnOverdue: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await db.slackConfig.findFirst({
    select: { id: true, webhookUrl: true, channel: true, enabled: true, notifyOnStatus: true, notifyOnAssign: true, notifyOnOverdue: true },
  });

  // Mask the webhook URL for non-admins
  if (config && session.user.role !== "ADMIN") {
    return NextResponse.json({ data: { ...config, webhookUrl: config.webhookUrl ? "configured" : null } });
  }

  return NextResponse.json({ data: config });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  try {
    const existing = await db.slackConfig.findFirst();
    const config = existing
      ? await db.slackConfig.update({ where: { id: existing.id }, data: parsed.data })
      : await db.slackConfig.create({ data: parsed.data });

    return NextResponse.json({ data: config });
  } catch (err) {
    console.error("[slack POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await db.slackConfig.findFirst();
  if (existing) await db.slackConfig.delete({ where: { id: existing.id } });

  return NextResponse.json({ success: true });
}
