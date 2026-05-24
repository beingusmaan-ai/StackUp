"use client";

import { useState } from "react";
import { X, Sparkles, Calendar, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  estimatedHours?: number | null;
  dueDate?: string | null;
}

interface ScheduleItem {
  taskId: string;
  suggestedDueDate: string;
  order: number;
  reason: string;
}

interface Props {
  campaignName: string;
  endDate: string;
  tasks: Task[];
  onApply: (taskId: string, dueDate: string) => void;
  onClose: () => void;
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "text-slate-500",
  MEDIUM: "text-blue-600",
  HIGH: "text-orange-600",
  URGENT: "text-red-600",
};

export function TimelineOptimizerModal({ campaignName, endDate, tasks, onApply, onClose }: Props) {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [applyingAll, setApplyingAll] = useState(false);

  const remainingTasks = tasks.filter((t) => t.status !== "COMPLETED");

  async function optimize() {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/ai/timeline-optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName,
          endDate,
          today,
          tasks: remainingTasks.map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            estimatedHours: t.estimatedHours ?? null,
            currentDueDate: t.dueDate ?? null,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setSchedule(json.data.schedule ?? []);
      setSummary(json.data.summary ?? "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Optimization failed");
    } finally {
      setLoading(false);
    }
  }

  function applyOne(taskId: string, date: string) {
    onApply(taskId, date);
    setApplied((prev) => new Set([...prev, taskId]));
    toast.success("Due date updated");
  }

  async function applyAll() {
    setApplyingAll(true);
    for (const item of schedule) {
      onApply(item.taskId, item.suggestedDueDate);
      setApplied((prev) => new Set([...prev, item.taskId]));
      await new Promise((r) => setTimeout(r, 80));
    }
    setApplyingAll(false);
    toast.success(`${schedule.length} due dates updated`);
  }

  const taskMap = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const sortedSchedule = [...schedule].sort((a, b) => a.order - b.order);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold">Timeline Optimizer</h2>
              <p className="text-[11px] text-muted-foreground">Deadline: {new Date(endDate).toLocaleDateString()}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {schedule.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Sparkles className="w-10 h-10 text-violet-400 mb-3" />
            <p className="text-[13px] text-muted-foreground mb-1">
              <span className="font-semibold text-foreground">{remainingTasks.length} remaining tasks</span> to schedule
            </p>
            <p className="text-[12px] text-muted-foreground mb-5">
              AI will distribute tasks optimally to hit the {new Date(endDate).toLocaleDateString()} deadline.
            </p>
            <button
              onClick={optimize}
              disabled={loading || remainingTasks.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-[13px] font-medium rounded-xl transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? "Optimizing…" : "Optimize Timeline"}
            </button>
          </div>
        ) : (
          <>
            {summary && (
              <div className="px-5 py-3 bg-violet-50 dark:bg-violet-950/20 border-b border-violet-200 dark:border-violet-800 flex-shrink-0">
                <p className="text-[12px] text-violet-700 dark:text-violet-300 flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  {summary}
                </p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {sortedSchedule.map((item) => {
                const task = taskMap[item.taskId];
                if (!task) return null;
                const isApplied = applied.has(item.taskId);
                return (
                  <div key={item.taskId} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-[11px] text-muted-foreground w-4 flex-shrink-0 font-mono">{item.order}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{task.title}</p>
                      <p className="text-[11px] text-muted-foreground italic">{item.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn("text-[10px] font-semibold", PRIORITY_COLOR[task.priority])}>{task.priority}</span>
                      <span className="text-[12px] font-medium text-foreground">
                        {new Date(item.suggestedDueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                      <button
                        onClick={() => applyOne(item.taskId, item.suggestedDueDate)}
                        disabled={isApplied}
                        className={cn(
                          "w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-[11px]",
                          isApplied
                            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500"
                            : "bg-muted hover:bg-violet-50 dark:hover:bg-violet-950/20 text-muted-foreground hover:text-violet-600"
                        )}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3 border-t border-border flex-shrink-0 flex justify-between items-center">
              <button
                onClick={optimize}
                disabled={loading}
                className="flex items-center gap-1.5 text-[12px] text-violet-600 hover:text-violet-700 disabled:opacity-50 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? "Re-optimizing…" : "Regenerate"}
              </button>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-3 py-1.5 text-[12px] border border-border rounded-xl hover:bg-muted transition-colors">
                  Close
                </button>
                <button
                  onClick={applyAll}
                  disabled={applyingAll || applied.size === schedule.length}
                  className="px-3 py-1.5 text-[12px] bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                >
                  {applyingAll ? "Applying…" : `Apply All (${schedule.length - applied.size} left)`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
