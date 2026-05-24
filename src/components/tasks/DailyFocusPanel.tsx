"use client";

import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueDate?: Date | string | null;
}

interface FocusItem {
  taskId: string;
  reason: string;
}

interface DailyFocusPanelProps {
  tasks: Task[];
  onTaskClick: (id: string) => void;
}

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-500",
};

export function DailyFocusPanel({ tasks, onTaskClick }: DailyFocusPanelProps) {
  const [focus, setFocus] = useState<FocusItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [fetched, setFetched] = useState(false);

  const activeTasks = tasks.filter((t) => t.status !== "COMPLETED");

  async function fetchFocus() {
    if (activeTasks.length === 0) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/ai/daily-focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          today,
          tasks: activeTasks.map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            status: t.status,
            dueDate: t.dueDate ?? null,
          })),
        }),
      });
      const json = await res.json();
      if (res.ok) setFocus(json.data.focus ?? []);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }

  useEffect(() => {
    if (!fetched && activeTasks.length > 0) fetchFocus();
  }, [activeTasks.length]);  // eslint-disable-line react-hooks/exhaustive-deps

  if (dismissed || activeTasks.length === 0) return null;

  const focusTasks = focus
    .map((f) => ({ ...f, task: tasks.find((t) => t.id === f.taskId) }))
    .filter((f) => f.task);

  return (
    <div className="mb-4 border border-violet-200 dark:border-violet-800/50 rounded-xl overflow-hidden bg-violet-50/50 dark:bg-violet-950/10">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-200 dark:border-violet-800/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-[12px] font-semibold text-violet-700 dark:text-violet-400">
            Focus for today
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={fetchFocus}
            disabled={loading}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-400 disabled:opacity-40"
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-400"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {loading && !fetched ? (
        <div className="px-4 py-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-violet-100 dark:bg-violet-900/20 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : focusTasks.length === 0 ? (
        <div className="px-4 py-3 text-[12px] text-muted-foreground">
          No focus suggestions available.
        </div>
      ) : (
        <div className="divide-y divide-violet-100 dark:divide-violet-900/30">
          {focusTasks.map(({ taskId, reason, task }) => (
            <button
              key={taskId}
              type="button"
              onClick={() => onTaskClick(taskId)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-violet-100/50 dark:hover:bg-violet-900/20 transition-colors text-left"
            >
              <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", PRIORITY_DOT[task!.priority] ?? "bg-slate-400")} />
              <span className="text-[13px] font-medium text-foreground flex-1 truncate">{task!.title}</span>
              <span className="text-[11px] text-violet-500 dark:text-violet-400 flex-shrink-0 italic">{reason}</span>
              {task!.dueDate && (
                <span className="text-[11px] text-muted-foreground flex-shrink-0">{formatDate(task!.dueDate)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
