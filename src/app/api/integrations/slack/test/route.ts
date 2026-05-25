import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendSlackMessage } from "@/lib/slack";

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sent = await sendSlackMessage({
    text: "✅ StackUp — Slack integration is working!",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "✅ *Slack Integration Active*\nYour StackUp workspace is now connected to Slack. You'll receive notifications for task updates, assignments, and daily digests.",
        },
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: `Sent by ${session.user.name} · ${new Date().toLocaleString()}` }],
      },
    ],
  });

  if (!sent) return NextResponse.json({ error: "Failed to send — check webhook URL" }, { status: 400 });
  return NextResponse.json({ success: true });
}
