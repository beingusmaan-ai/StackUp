import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isEmailConfigured } from "@/lib/email";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    data: {
      configured: isEmailConfigured(),
      user: isEmailConfigured() ? process.env.EMAIL_USER : null,
    },
  });
}
