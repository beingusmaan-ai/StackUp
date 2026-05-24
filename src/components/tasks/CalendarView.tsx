"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";

type CalTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | string | null;
  assignees: { user: { id: string; name: string } }[];
  campaign?: { name: string } | null;
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-200 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export function CalendarView({ tasks }: { tasks: CalTask[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const paddingDays = Array(monthStart.getDay()).fill(null);

  function getTasksForDay(day: Date) {
    return tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), day));
  }

  const selectedTasks = selectedDay ? getTasksForDay(selectedDay) : [];

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{format(currentDate, "MMMM yyyy")}</h2>
          <div className="flex gap-2">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="w-9 h-9 rounded-xl bg-muted hover:bg-accent flex items-center justify-center transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 h-9 rounded-xl bg-muted hover:bg-accent text-sm font-medium transition-colors">Today</button>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="w-9 h-9 rounded-xl bg-muted hover:bg-accent flex items-center justify-center transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {paddingDays.map((_, i) => <div key={`pad-${i}`} />)}
          {days.map((day) => {
            const dayTasks = getTasksForDay(day);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={cn(
                  "min-h-20 p-1.5 rounded-xl text-left transition-colors hover:bg-muted",
                  isSelected && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30",
                  isToday(day) && "border-2 border-blue-400"
                )}
              >
                <span className={cn("text-xs font-medium block mb-1", isToday(day) ? "text-blue-600" : "text-foreground")}>
                  {format(day, "d")}
                </span>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map((t) => (
                    <div key={t.id} className={cn("text-[10px] px-1.5 py-0.5 rounded truncate", PRIORITY_COLORS[t.priority] ?? "bg-slate-100")}>
                      {t.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && <div className="text-[10px] text-muted-foreground px-1">+{dayTasks.length - 3} more</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold mb-4">{format(selectedDay, "EEEE, MMMM d")} — {selectedTasks.length} task(s)</h3>
          {selectedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks due this day.</p>
          ) : (
            <div className="space-y-3">
              {selectedTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-foreground">{t.title}</p>
                    {t.campaign && <p className="text-xs text-muted-foreground mt-0.5">{t.campaign.name}</p>}
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
