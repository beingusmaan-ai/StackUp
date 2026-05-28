import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY)
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const { taskId } = await req.json();
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: {
      title: true,
      description: true,
      status: true,
      comments: {
        orderBy: { createdAt: "asc" },
        select: {
          content: true,
          createdAt: true,
          author: { select: { name: true } },
        },
      },
      activityLog: {
        orderBy: { createdAt: "asc" },
        take: 20,
        select: {
          action: true,
          fromValue: true,
          toValue: true,
          actor: { select: { name: true } },
        },
      },
    },
  });

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const commentText = task.comments
    .map((c) => `${c.author.name}: ${c.content}`)
    .join("\n");

  const activityText = task.activityLog
    .map((a) =>
      `${a.actor.name} ${
        a.action === "status_changed"
          ? `changed status from ${a.fromValue} to ${a.toValue}`
          : a.action.replace(/_/g, " ")
      }`
    )
    .join("\n");

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const res = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 512,
    messages: [
      {
        role: "system",
        content:
          "You are a concise project assistant. Summarize task discussions clearly and professionally. No preambles like 'Here is a summary'.",
      },
      {
        role: "user",
        content: `Summarize the discussion and progress for this task:

Task: ${task.title}
Status: ${task.status}${task.description ? `\nDescription: ${task.description}` : ""}

${commentText ? `Comments:\n${commentText}\n` : "No comments yet.\n"}
${activityText ? `Activity:\n${activityText}` : ""}

Cover: what's been discussed, current status, and any open questions or blockers. Be brief.`,
      },
    ],
  });

  const summary = res.choices[0]?.message?.content ?? "";
  return NextResponse.json({ summary });
}
