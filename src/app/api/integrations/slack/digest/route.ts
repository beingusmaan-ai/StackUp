import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendDailyDigest } from "@/lib/slack";

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await sendDailyDigest();
  if (!result.sent) return NextResponse.json({ error: result.reason ?? "Failed to send digest" }, { status: 400 });

  return NextResponse.json({ success: true, ...result });
}
