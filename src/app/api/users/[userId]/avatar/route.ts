import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const user = await db.user.findUnique({ where: { id: userId }, select: { avatarData: true } });

  if (!user?.avatarData) {
    return new NextResponse(null, { status: 404 });
  }

  // avatarData is stored as "data:<mime>;base64,<data>"
  const commaIdx = user.avatarData.indexOf(",");
  const header = commaIdx !== -1 ? user.avatarData.slice(0, commaIdx) : "";
  const mimeMatch = header.match(/^data:([^;]+);base64$/);
  const match = mimeMatch ? [null, mimeMatch[1], user.avatarData.slice(commaIdx + 1)] : null;
  if (!match) return new NextResponse(null, { status: 404 });

  const [, mimeType, base64] = match as [unknown, string, string];
  const buffer = Buffer.from(base64, "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
