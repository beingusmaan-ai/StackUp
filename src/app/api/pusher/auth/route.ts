import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id")!;
  const channel = params.get("channel_name")!;

  const authResponse = pusherServer.authorizeChannel(socketId, channel, {
    user_id: session.user.id,
    user_info: { name: session.user.name },
  });

  return NextResponse.json(authResponse);
}
