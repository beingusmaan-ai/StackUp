import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const doc = await db.doc.findUnique({
    where: { id },
    include: { createdBy: { select: { name: true } } },
  });

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!doc.isPublic) return NextResponse.json({ error: "This document is not publicly shared" }, { status: 403 });

  return NextResponse.json({ data: doc });
}
