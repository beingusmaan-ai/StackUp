import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail, isEmailConfigured } from "@/lib/email";

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!isEmailConfigured()) return NextResponse.json({ error: "Email not configured. Add EMAIL_USER and EMAIL_PASS to .env.local" }, { status: 400 });

  const html = `<!DOCTYPE html>
<html><body style="font-family:sans-serif;background:#f4f4f5;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;">
    <div style="background:#e8170b;padding:20px 28px;">
      <p style="margin:0;color:#fff;font-size:15px;font-weight:700;">Arthur Lawrence Marketing Hub</p>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#111;">Test Email</p>
      <p style="margin:0;font-size:14px;color:#555;">Your email notifications are working correctly.</p>
    </div>
  </div>
</body></html>`;

  const sent = await sendEmail(session.user.email!, "Test email from Marketing Hub", html);

  if (!sent) return NextResponse.json({ error: "Failed to send. Check EMAIL_USER and EMAIL_PASS in .env.local" }, { status: 500 });
  return NextResponse.json({ success: true, to: session.user.email });
}
