"use client";

import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, { bar: string; text: string }> = {
  TODO:               { bar: "bg-slate-400",   text: "text-white" },
  ASSIGNED:           { bar: "bg-purple-500",  text: "text-white" },
  IN_PROGRESS:        { bar: "bg-amber-500",   text: "text-white" },
  WAITING_APPROVAL:   { bar: "bg-blue-500",    text: "text-white" },
  REVISION_REQUIRED:  { bar: "bg-orange-500",  text: "text-white" },
  COMPLETED:          { bar: "bg-emerald-500", text: "text-white" },
  BLOCKED:            { bar: "bg-red-500",     text: "text-white" },
};

const LABEL_W = 200;
const DAY_W   = 32;
const ROW_H   = 48;

export interface GanttTask {
  id: string;
  title: string;
  status: string;
  startDate?: string | null;
  dueDate?: string | null;
}

function toUTCDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function getBar(
  task: GanttTask,
  timelineStart: Date,
  totalDays: number,
): { startDay: number; spanDays: number } {
  let startDay: number;
  let endDay: number;

  if (task.startDate) {
    startDay = daysBetween(timelineStart, toUTCDay(new Date(task.startDate)));
  } else if (task.dueDate) {
    startDay = daysBetween(timelineStart, toUTCDay(new Date(task.dueDate))) - 2;
  } else {
    startDay = 0;
  }

  if (task.dueDate) {
    endDay = daysBetween(timelineStart, toUTCDay(new Date(task.dueDate)));
  } else if (task.startDate) {
    endDay = startDay + 2;
  } else {
    endDay = totalDays - 1;
  }

  startDay = Math.max(0, Math.min(startDay, totalDays - 1));
  endDay   = Math.max(startDay, Math.min(endDay, totalDays - 1));

  return { startDay, spanDays: Math.max(1, endDay - startDay + 1) };
}

export function GanttView({
  tasks,
  campaignStart,
  campaignEnd,
}: {
  tasks: GanttTask[];
  campaignStart: string;
  campaignEnd: string;
}) {
  const timelineStart = toUTCDay(new Date(campaignStart));
  const timelineEnd   = toUTCDay(new Date(campaignEnd));
  const totalDays     = Math.max(7, daysBetween(timelineStart, timelineEnd) + 1);
  const totalWidth    = LABEL_W + totalDays * DAY_W;

  // Today
  const today       = toUTCDay(new Date());
  const todayOffset = daysBetween(timelineStart, today);
  const showToday   = todayOffset >= 0 && todayOffset < totalDays;

  // Month segments for the top header row
  const months: { label: string; startDay: number; days: number }[] = [];
  let cursor = new Date(timelineStart);
  while (daysBetween(timelineStart, cursor) < totalDays) {
    const segStart   = new Date(cursor);
    const nextMonth  = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    const segStartDay = daysBetween(timelineStart, segStart);
    const segEndDay   = Math.min(totalDays, daysBetween(timelineStart, nextMonth));
    months.push({
      label: segStart.toLocaleString("default", { month: "short", year: "2-digit" }),
      startDay: segStartDay,
      days: segEndDay - segStartDay,
    });
    cursor = nextMonth;
  }

  return (
    <div className="flex-1 overflow-auto select-none">
      <div style={{ width: totalWidth }}>

        {/* ── Month header (sticky top:0) ── */}
        <div
          className="sticky top-0 z-20 flex border-b border-border bg-background/95 backdrop-blur-sm"
          style={{ height: 28 }}
        >
          {/* corner */}
          <div
            className="sticky left-0 z-30 bg-background border-r border-border flex items-center px-4 shrink-0"
            style={{ width: LABEL_W }}
          >
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Task</span>
          </div>
          {months.map((m, i) => (
            <div
              key={i}
              style={{ width: m.days * DAY_W, minWidth: m.days * DAY_W }}
              className="flex items-center px-2 border-r border-border/40 bg-background/95 shrink-0"
            >
              <span className="text-[10px] font-semibold text-muted-foreground truncate">{m.label}</span>
            </div>
          ))}
        </div>

        {/* ── Day header (sticky top:28px) ── */}
        <div
          className="sticky z-20 flex border-b border-border bg-background/95 backdrop-blur-sm"
          style={{ top: 28, height: 28 }}
        >
          {/* corner */}
          <div
            className="sticky left-0 z-30 bg-background/95 border-r border-border shrink-0"
            style={{ width: LABEL_W }}
          />
          {Array.from({ length: totalDays }).map((_, i) => {
            const d        = new Date(timelineStart.getTime() + i * 86_400_000);
            const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
            const isToday   = todayOffset === i;
            return (
              <div
                key={i}
                style={{ width: DAY_W, minWidth: DAY_W }}
                className={cn(
                  "shrink-0 flex items-center justify-center border-r border-border/20",
                  isWeekend ? "bg-muted/50" : "bg-background/95",
                )}
              >
                <span className={cn(
                  "text-[9px] font-medium",
                  isToday
                    ? "text-[#e8170b] font-bold"
                    : "text-muted-foreground/50",
                )}>
                  {d.getUTCDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Task rows ── */}
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            No tasks in this list.
          </div>
        ) : (
          tasks.map((task) => {
            const { startDay, spanDays } = getBar(task, timelineStart, totalDays);
            const colors = STATUS_COLORS[task.status] ?? STATUS_COLORS.TODO;
            const barLeft  = startDay * DAY_W;
            const barWidth = Math.min(spanDays * DAY_W, totalDays * DAY_W - barLeft);

            return (
              <div
                key={task.id}
                className="flex border-b border-border/30"
                style={{ height: ROW_H }}
              >
                {/* Sticky task name */}
                <div
                  className="sticky left-0 z-10 bg-background border-r border-border/50 flex items-center px-4 shrink-0"
                  style={{ width: LABEL_W }}
                >
                  <span className="text-xs font-medium truncate text-foreground">{task.title}</span>
                </div>

                {/* Timeline strip */}
                <div
                  className="relative shrink-0"
                  style={{ width: totalDays * DAY_W, height: ROW_H }}
                >
                  {/* Weekend column shading */}
                  {Array.from({ length: totalDays }).map((_, i) => {
                    const d = new Date(timelineStart.getTime() + i * 86_400_000);
                    return (d.getUTCDay() === 0 || d.getUTCDay() === 6) ? (
                      <div
                        key={i}
                        className="absolute inset-y-0 bg-muted/30 pointer-events-none"
                        style={{ left: i * DAY_W, width: DAY_W }}
                      />
                    ) : null;
                  })}

                  {/* Today line */}
                  {showToday && (
                    <div
                      className="absolute inset-y-0 w-px bg-[#e8170b]/40 pointer-events-none z-10"
                      style={{ left: todayOffset * DAY_W + DAY_W / 2 }}
                    />
                  )}

                  {/* Task bar */}
                  <div
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 rounded-lg flex items-center px-2.5 overflow-hidden",
                      "shadow-sm transition-opacity hover:opacity-90 cursor-default",
                      colors.bar,
                    )}
                    style={{ left: barLeft, width: barWidth, height: 28 }}
                    title={task.title}
                  >
                    <span className={cn("text-[10px] font-semibold truncate", colors.text)}>
                      {task.title}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 px-4 py-3 border-t border-border mt-2">
          {Object.entries(STATUS_COLORS).map(([status, { bar }]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={cn("w-3 h-3 rounded-sm", bar)} />
              <span className="text-[10px] text-muted-foreground capitalize">
                {status.replace(/_/g, " ").toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
