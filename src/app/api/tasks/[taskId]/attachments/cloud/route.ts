import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  fileName:   z.string().min(1),
  fileUrl:    z.string().url(),
  mimeType:   z.string().default("application/octet-stream"),
  fileSize:   z.number().default(0),
  source:     z.enum(["google_drive", "onedrive"]),
  externalId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const attachment = await db.taskAttachment.create({
    data: {
      taskId,
      fileName:   parsed.data.fileName,
      fileUrl:    parsed.data.fileUrl,
      mimeType:   parsed.data.mimeType,
      fileSize:   parsed.data.fileSize,
      source:     parsed.data.source,
      externalId: parsed.data.externalId,
    },
  });

  return NextResponse.json({ data: attachment }, { status: 201 });
}
