import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files.length) return NextResponse.json({ error: "No files provided" }, { status: 422 });

  const uploadDir = path.join(process.cwd(), "public", "uploads", taskId);
  await mkdir(uploadDir, { recursive: true });

  const attachments = await Promise.all(
    files.map(async (file) => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      await writeFile(path.join(uploadDir, safeName), buffer);

      return db.taskAttachment.create({
        data: {
          taskId,
          fileName: file.name,
          fileUrl: `/uploads/${taskId}/${safeName}`,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
        },
      });
    })
  );

  return NextResponse.json({ data: attachments }, { status: 201 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const attachments = await db.taskAttachment.findMany({
    where: { taskId },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json({ data: attachments });
}
