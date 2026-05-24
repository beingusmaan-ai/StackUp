import nodemailer from "nodemailer";
import { db } from "@/lib/db";

export function isEmailConfigured() {
  return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: process.env.EMAIL_USER!, pass: process.env.EMAIL_PASS! },
  });
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  try {
    await createTransporter().sendMail({
      from: `"Arthur Lawrence Marketing Hub" <${process.env.EMAIL_USER}>`,
      to, subject, html,
    });
    return true;
  } catch (err) {
    console.error("[email]", err);
    return false;
  }
}

function labelStatus(s: string) {
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: "#10b981", IN_PROGRESS: "#3b82f6", BLOCKED: "#ef4444",
  WAITING_APPROVAL: "#f59e0b", REVISION_REQUIRED: "#8b5cf6",
  TODO: "#6b7280", ASSIGNED: "#6366f1",
};

function layout(body: string): string {
  const appUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;margin:0;padding:24px 16px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
    <div style="background:#e8170b;padding:20px 28px;">
      <p style="margin:0;color:#fff;font-size:15px;font-weight:700;">Arthur Lawrence Marketing Hub</p>
    </div>
    <div style="padding:28px;">${body}</div>
    <div style="padding:14px 28px;background:#f9f9f9;border-top:1px solid #f0f0f0;">
      <p style="margin:0;font-size:11px;color:#aaa;">Automated notification${appUrl ? ` · <a href="${appUrl}" style="color:#e8170b;text-decoration:none;">Open app</a>` : ""}</p>
    </div>
  </div>
</body></html>`;
}

export async function notifyStatusChange({
  taskTitle, taskId, fromStatus, toStatus, actorName, campaignName,
}: {
  taskTitle: string; taskId: string; fromStatus: string;
  toStatus: string; actorName: string; campaignName?: string | null;
}) {
  if (!isEmailConfigured()) return;

  const appUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "";
  const taskUrl = appUrl ? `${appUrl}/tasks?task=${taskId}` : "";
  const color = STATUS_COLOR[toStatus] ?? "#6b7280";

  const assignees = await db.taskAssignee.findMany({
    where: { taskId },
    include: { user: { select: { email: true, name: true } } },
  });
  if (!assignees.length) return;

  const html = layout(`
    <p style="margin:0 0 20px;font-size:18px;font-weight:700;color:#111;">Task Status Updated</p>
    <div style="background:#f8f8f8;border-radius:12px;padding:18px;margin-bottom:20px;">
      <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#111;">${taskTitle}</p>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <span style="font-size:12px;color:#777;background:#ececec;padding:3px 10px;border-radius:20px;">${labelStatus(fromStatus)}</span>
        <span style="font-size:13px;color:#aaa;">→</span>
        <span style="font-size:12px;color:#fff;background:${color};padding:3px 10px;border-radius:20px;font-weight:600;">${labelStatus(toStatus)}</span>
      </div>
      ${campaignName ? `<p style="margin:10px 0 0;font-size:12px;color:#777;">Campaign: <strong style="color:#333;">${campaignName}</strong></p>` : ""}
      <p style="margin:10px 0 0;font-size:12px;color:#777;">Updated by <strong style="color:#333;">${actorName}</strong></p>
    </div>
    ${taskUrl ? `<a href="${taskUrl}" style="display:inline-block;background:#e8170b;color:#fff;text-decoration:none;padding:10px 22px;border-radius:10px;font-size:13px;font-weight:600;">View Task</a>` : ""}
  `);

  await Promise.all(
    assignees.map((a) => sendEmail(a.user.email, `Task updated: "${taskTitle}" → ${labelStatus(toStatus)}`, html))
  );
}

export async function notifyAssignment({
  taskTitle, taskId, assigneeName, assigneeEmail, assignerName, dueDate,
}: {
  taskTitle: string; taskId: string; assigneeName: string; assigneeEmail: string;
  assignerName: string; dueDate?: Date | null;
}) {
  if (!isEmailConfigured()) return;

  const appUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "";
  const taskUrl = appUrl ? `${appUrl}/tasks?task=${taskId}` : "";
  const dueDateStr = dueDate
    ? new Date(dueDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : null;

  const html = layout(`
    <p style="margin:0 0 20px;font-size:18px;font-weight:700;color:#111;">You've been assigned a task</p>
    <div style="background:#f8f8f8;border-radius:12px;padding:18px;margin-bottom:20px;">
      <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#111;">${taskTitle}</p>
      <p style="margin:0 0 6px;font-size:12px;color:#777;">Assigned by <strong style="color:#333;">${assignerName}</strong></p>
      ${dueDateStr ? `<p style="margin:0;font-size:12px;color:#777;">Due: <strong style="color:#333;">${dueDateStr}</strong></p>` : ""}
    </div>
    <p style="margin:0 0 20px;font-size:13px;color:#555;">Hi ${assigneeName}, you have a new task waiting for you.</p>
    ${taskUrl ? `<a href="${taskUrl}" style="display:inline-block;background:#e8170b;color:#fff;text-decoration:none;padding:10px 22px;border-radius:10px;font-size:13px;font-weight:600;">Open Task</a>` : ""}
  `);

  await sendEmail(assigneeEmail, `New task assigned: "${taskTitle}"`, html);
}
