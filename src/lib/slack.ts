import { db } from "@/lib/db";

interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

interface SlackPayload {
  text: string;
  blocks?: SlackBlock[];
}

export async function getSlackConfig() {
  return db.slackConfig.findFirst();
}

export async function sendSlackMessage(payload: SlackPayload): Promise<boolean> {
  const config = await getSlackConfig();
  if (!config?.enabled || !config.webhookUrl) return false;

  try {
    const res = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function notifyStatusChange({
  taskTitle, taskId, fromStatus, toStatus, actorName, campaignName,
}: {
  taskTitle: string; taskId: string; fromStatus: string;
  toStatus: string; actorName: string; campaignName?: string | null;
}) {
  const config = await getSlackConfig();
  if (!config?.enabled || !config.notifyOnStatus) return;

  const statusLabel = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const emoji: Record<string, string> = {
    COMPLETED: "✅", IN_PROGRESS: "🔄", BLOCKED: "🚫",
    WAITING_APPROVAL: "⏳", REVISION_REQUIRED: "🔁", TODO: "📋", ASSIGNED: "📌",
  };

  await sendSlackMessage({
    text: `Task status updated: "${taskTitle}"`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji[toStatus] ?? "📝"} *Task Status Updated*\n*Task:* ${taskTitle}\n*Status:* ${statusLabel(fromStatus)} → *${statusLabel(toStatus)}*\n*By:* ${actorName}${campaignName ? `\n*Campaign:* ${campaignName}` : ""}`,
        },
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: `StackUp · <${process.env.NEXTAUTH_URL ?? ""}/tasks?task=${taskId}|View Task>` }],
      },
    ],
  });
}

export async function notifyAssignment({
  taskTitle, taskId, assigneeName, assignerName, dueDate,
}: {
  taskTitle: string; taskId: string; assigneeName: string; assignerName: string; dueDate?: Date | null;
}) {
  const config = await getSlackConfig();
  if (!config?.enabled || !config.notifyOnAssign) return;

  await sendSlackMessage({
    text: `New task assigned to ${assigneeName}: "${taskTitle}"`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `📌 *New Task Assigned*\n*Task:* ${taskTitle}\n*Assigned to:* ${assigneeName}\n*By:* ${assignerName}${dueDate ? `\n*Due:* ${new Date(dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}`,
        },
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: `StackUp · <${process.env.NEXTAUTH_URL ?? ""}/tasks?task=${taskId}|View Task>` }],
      },
    ],
  });
}

export async function sendDailyDigest() {
  const config = await getSlackConfig();
  if (!config?.enabled) return { sent: false, reason: "Slack not configured" };

  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const [overdue, dueToday, inProgress] = await Promise.all([
    db.task.count({ where: { dueDate: { lt: today }, status: { notIn: ["COMPLETED", "BLOCKED"] } } }),
    db.task.count({ where: { dueDate: { gte: today, lt: tomorrow }, status: { not: "COMPLETED" } } }),
    db.task.count({ where: { status: "IN_PROGRESS" } }),
  ]);

  const topOverdue = await db.task.findMany({
    where: { dueDate: { lt: today }, status: { notIn: ["COMPLETED", "BLOCKED"] } },
    include: { assignees: { include: { user: { select: { name: true } } }, take: 1 } },
    orderBy: { dueDate: "asc" },
    take: 5,
  });

  const overdueLines = topOverdue.map((t) => {
    const days = Math.floor((today.getTime() - new Date(t.dueDate!).getTime()) / 86400000);
    const assignee = t.assignees[0]?.user.name ?? "Unassigned";
    return `• ${t.title} _(${days}d overdue · ${assignee})_`;
  }).join("\n");

  const sent = await sendSlackMessage({
    text: `Daily StackUp Digest — ${today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "📊 Daily StackUp Digest" },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*🚨 Overdue*\n${overdue} tasks` },
          { type: "mrkdwn", text: `*📅 Due Today*\n${dueToday} tasks` },
          { type: "mrkdwn", text: `*🔄 In Progress*\n${inProgress} tasks` },
        ],
      },
      ...(topOverdue.length > 0 ? [{
        type: "section",
        text: { type: "mrkdwn", text: `*Top Overdue Tasks:*\n${overdueLines}` },
      }] : []),
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: `StackUp · ${today.toLocaleDateString()}` }],
      },
    ],
  });

  return { sent, overdue, dueToday, inProgress };
}
