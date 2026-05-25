import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 422 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "File must be an image" }, { status: 422 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be under 2 MB" }, { status: 422 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const imageUrl = `data:${file.type};base64,${base64}`;

    // resolve real DB user id via email (stale JWT guard)
    let dbUserId = session.user.id;
    if (session.user.email) {
      const me = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      if (me) dbUserId = me.id;
    }

    await db.user.update({
      where: { id: dbUserId },
      data: { image: imageUrl },
    });

    return NextResponse.json({ imageUrl });
  } catch (err) {
    console.error("[POST /api/users/me/avatar]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let dbUserId = session.user.id;
    if (session.user.email) {
      const me = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      if (me) dbUserId = me.id;
    }

    await db.user.update({
      where: { id: dbUserId },
      data: { image: null },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/users/me/avatar]", err);
    return NextResponse.json({ error: "Failed to remove avatar" }, { status: 500 });
  }
}
