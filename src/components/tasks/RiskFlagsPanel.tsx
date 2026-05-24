"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  status: string;
  dueDate?: Date | string | null;
  assignees: { user: { id: string } }[];
}

interface RiskFlag {
  taskId: string;
  title: string;
  reason: string;
  type: "overdue" | "no_assignee" | "no_deadline" | "blocked";
}

const RISK_COLOR: Record<RiskFlag["type"], string> = {
  overdue: "text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
  blocked: "text-orange-600 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
  no_assignee: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800",
  no_deadline: "text-slate-600 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700",
};

const RISK_LABEL: Record<RiskFlag["type"], string> = {
  overdue: "Overdue",
  blocked: "Blocked",
  no_assignee: "No assignee",
  no_deadline: "No deadline",
};

interface RiskFlagsPanelProps {
  tasks: Task[];
  onTaskClick: (id: string) => void;
}

export function RiskFlagsPanel({ tasks, onTaskClick }: RiskFlagsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const flags: RiskFlag[] = [];
  for (const task of tasks) {
    if (task.status === "COMPLETED") continue;
    const due = task.dueDate ? new Date(task.dueDate) : null;
    if (due && due < today) {
      flags.push({ taskId: task.id, title: task.title, reason: "Past due date", type: "overdue" });
    } else if (task.status === "BLOCKED") {
      flags.push({ taskId: task.id, title: task.title, reason: "Marked as blocked", type: "blocked" });
    } else if (task.assignees.length === 0) {
      flags.push({ taskId: task.id, title: task.title, reason: "No one assigned", type: "no_assignee" });
    } else if (!task.dueDate) {
      flags.push({ taskId: task.id, title: task.title, reason: "Missing deadline", type: "no_deadline" });
    }
  }

  if (flags.length === 0) return null;

  const overdue = flags.filter((f) => f.type === "overdue").length;
  const blocked = flags.filter((f) => f.type === "blocked").length;
  const unassigned = flags.filter((f) => f.type === "no_assignee").length;

  return (
    <div className="mb-3 border border-orange-200 dark:border-orange-800/50 rounded-xl overflow-hidden bg-orange-50/50 dark:bg-orange-950/10">
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
          <span className="text-[12px] font-semibold text-orange-700 dark:text-orange-400">
            {flags.length} tasks need attention
          </span>
          <div className="flex items-center gap-1.5 ml-1">
            {overdue > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 font-medium">
                {overdue} overdue
              </span>
            )}
            {blocked > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 font-medium">
                {blocked} blocked
              </span>
            )}
            {unassigned > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-950/40 text-yellow-600 font-medium">
                {unassigned} unassigned
              </span>
            )}
          </div>
          {expanded
            ? <ChevronDown className="w-3 h-3 text-orange-500 ml-auto flex-shrink-0" />
            : <ChevronRight className="w-3 h-3 text-orange-500 ml-auto flex-shrink-0" />}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="ml-2 w-5 h-5 flex items-center justify-center rounded hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-400 flex-shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-orange-200 dark:border-orange-800/50 divide-y divide-orange-100 dark:divide-orange-900/30">
          {flags.map((flag) => (
            <button
              key={`${flag.taskId}-${flag.type}`}
              type="button"
              onClick={() => onTaskClick(flag.taskId)}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-orange-100/50 dark:hover:bg-orange-900/20 transition-colors text-left"
            >
              <span className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0",
                RISK_COLOR[flag.type]
              )}>
                {RISK_LABEL[flag.type]}
              </span>
              <span className="text-[12px] text-foreground truncate flex-1">{flag.title}</span>
              <span className="text-[11px] text-muted-foreground flex-shrink-0">{flag.reason}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
