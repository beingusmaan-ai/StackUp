"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  assignees: { user: { id: string; name: string; image?: string | null } }[];
}

interface CalendarViewProps {
  tasks: CalendarTask[];
  onTaskClick: (id: string) => void;
}

const STATUS_DOT: Record<string, string> = {
  TODO:               "bg-slate-400",
  ASSIGNED:           "bg-purple-500",
  IN_PROGRESS:        "bg-blue-500",
  WAITING_APPROVAL:   "bg-sky-400",
  REVISION_REQUIRED:  "bg-orange-500",
  COMPLETED:          "bg-emerald-500",
  BLOCKED:            "bg-red-500",
};

const PRIORITY_BORDER: Record<string, string> = {
  URGENT: "border-l-red-500",
  HIGH:   "border-l-orange-400",
  MEDIUM: "border-l-blue-400",
  LOW:    "border-l-slate-300",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();

  // Build 6-week grid (42 cells)
  const cells: { date: number; curMonth: boolean; fullDate: string }[] = [];
  for (let i = 0; i < firstDay; i++) {
    const d = daysInPrev - firstDay + 1 + i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ date: d, curMonth: false, fullDate: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: d, curMonth: true, fullDate: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
  }
  while (cells.length < 42) {
    const d = cells.length - firstDay - daysInMonth + 1;
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ date: d, curMonth: false, fullDate: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
  }

  // Map tasks by due date (YYYY-MM-DD)
  const tasksByDate: Record<string, CalendarTask[]> = {};
  tasks.forEach((t) => {
    if (!t.dueDate) return;
    const key = new Date(t.dueDate).toISOString().slice(0, 10);
    if (!tasksByDate[key]) tasksByDate[key] = [];
    tasksByDate[key].push(t);
  });

  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
        <h3 className="text-sm font-semibold text-foreground">
          {MONTH_NAMES[month]} {year}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="px-2.5 py-1 rounded-lg hover:bg-muted transition-colors text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Today
          </button>
          <button
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 border-b border-border flex-shrink-0">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 h-full" style={{ minHeight: 480 }}>
          {cells.map((cell, i) => {
            const cellTasks = tasksByDate[cell.fullDate] ?? [];
            const isToday = cell.fullDate === todayStr && cell.curMonth;
            const isPast  = cell.fullDate < todayStr && cell.curMonth;

            return (
              <div
                key={i}
                className={cn(
                  "min-h-[100px] p-1.5 border-b border-r border-border/50 flex flex-col gap-1",
                  !cell.curMonth && "bg-muted/20",
                  isToday && "bg-[#e8170b]/5"
                )}
              >
                <div className={cn(
                  "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 self-end",
                  isToday ? "bg-[#e8170b] text-white" : isPast ? "text-muted-foreground/40" : !cell.curMonth ? "text-muted-foreground/30" : "text-foreground"
                )}>
                  {cell.date}
                </div>

                {cellTasks.slice(0, 3).map((task) => (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick(task.id)}
                    className={cn(
                      "w-full text-left px-1.5 py-1 rounded text-[11px] leading-tight border-l-2 bg-card hover:shadow-sm transition-shadow truncate",
                      PRIORITY_BORDER[task.priority] ?? "border-l-slate-300",
                      task.dueDate && new Date(task.dueDate) < today && task.status !== "COMPLETED" && "opacity-80"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", STATUS_DOT[task.status] ?? "bg-slate-400")} />
                      <span className="truncate font-medium">{task.title}</span>
                    </div>
                  </button>
                ))}
                {cellTasks.length > 3 && (
                  <span className="text-[10px] text-muted-foreground pl-1">+{cellTasks.length - 3} more</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
