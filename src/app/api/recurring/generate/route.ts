import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeNextRunDate, hasReachedEnd, Frequency, EndType } from "@/lib/recurring";

export async function POST(req: NextRequest) {
  // Accept either a valid admin session or a CRON_SECRET bearer token
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  let authorized = false;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    authorized = true;
  } else {
    const session = await auth();
    if (session && session.user.role !== "TEAM_MEMBER") authorized = true;
  }

  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { templateId?: string; force?: boolean };
  const { templateId, force } = body;

  const now = new Date();

  // When force=true with a specific templateId, bypass isActive and schedule checks
  const where = templateId && force
    ? { id: templateId }
    : templateId
    ? { id: templateId, isActive: true, nextRunAt: { lte: now } }
    : { isActive: true, nextRunAt: { lte: now } };

  const templates = await db.recurringTemplate.findMany({ where });

  const results: { templateId: string; taskId?: string; success: boolean; error?: string }[] = [];

  for (const t of templates) {
    try {
      const assigneeIds = t.assigneeIds ? t.assigneeIds.split(",").filter(Boolean) : [];

      const task = await db.task.create({
        data: {
          title: t.title,
          description: t.description,
          taskType: t.taskType,
          priority: t.priority,
          estimatedHours: t.estimatedHours,
          campaignId: t.campaignId,
          createdById: t.createdById,
          recurringTemplateId: t.id,
          status: assigneeIds.length > 0 ? "ASSIGNED" : "TODO",
          dueDate: t.nextRunAt && t.nextRunAt > now ? t.nextRunAt : now,
          assignees:
            assigneeIds.length > 0
              ? { create: assigneeIds.map((uid) => ({ userId: uid })) }
              : undefined,
        },
      });

      const config = {
        frequency: t.frequency as Frequency,
        interval: t.interval,
        weekDays: t.weekDays,
        monthDay: t.monthDay,
        startDate: t.startDate,
        endType: t.endType as EndType,
        endDate: t.endDate,
        endCount: t.endCount,
        generatedCount: t.generatedCount + 1,
      };

      const nextRunAt = computeNextRunDate(config, t.nextRunAt ?? now);
      const ended = hasReachedEnd(config) || nextRunAt === null;

      await db.recurringTemplate.update({
        where: { id: t.id },
        data: {
          lastRunAt: t.nextRunAt ?? now,
          nextRunAt: ended ? null : nextRunAt,
          generatedCount: { increment: 1 },
          isActive: ended ? false : true,
        },
      });

      if (assigneeIds.length > 0) {
        db.notification.createMany({
          data: assigneeIds.map((uid) => ({
            userId: uid,
            type: "TASK_ASSIGNED",
            title: "Recurring task assigned",
            message: `A new recurring task has been assigned to you: ${task.title}`,
            taskId: task.id,
          })),
        }).catch((e) => console.error("[recurring/generate] notification failed:", e));
      }

      results.push({ templateId: t.id, taskId: task.id, success: true });
    } catch (err) {
      console.error(`[recurring/generate] template ${t.id} failed:`, err);
      results.push({ templateId: t.id, success: false, error: String(err) });
    }
  }

  return NextResponse.json({ generated: results.filter((r) => r.success).length, results });
}
