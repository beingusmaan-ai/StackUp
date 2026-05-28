"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Trash2, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarGroup } from "@/components/shared/UserAvatar";

interface TableTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  startDate?: string | null;
  estimatedHours?: number | null;
  assignees: { user: { id: string; name: string; image?: string | null } }[];
  _count: { subTasks: number; comments: number };
  listName?: string;
}

interface TableViewProps {
  tasks: TableTask[];
  canManage: boolean;
  onTaskClick: (id: string) => void;
  onDeleteTask: (id: string) => void;
  deletingTaskId: string | null;
}

type SortKey = "title" | "status" | "priority" | "dueDate" | "startDate" | "estimatedHours" | "assignees" | "subTasks" | "comments";
type SortDir = "asc" | "desc";

const STATUS_BADGE: Record<string, string> = {
  TODO:               "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  ASSIGNED:           "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
  IN_PROGRESS:        "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  WAITING_APPROVAL:   "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  REVISION_REQUIRED:  "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  COMPLETED:          "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  BLOCKED:            "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  CANCELLED:          "bg-slate-100 text-slate-500",
};

const STATUS_LABEL: Record<string, string> = {
  TODO: "To Do", ASSIGNED: "Assigned", IN_PROGRESS: "In Progress",
  WAITING_APPROVAL: "Approval", REVISION_REQUIRED: "Revision",
  COMPLETED: "Completed", BLOCKED: "Blocked", CANCELLED: "Cancelled",
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  URGENT: { label: "Urgent", color: "text-red-500" },
  HIGH:   { label: "High",   color: "text-orange-400" },
  MEDIUM: { label: "Medium", color: "text-blue-400" },
  LOW:    { label: "Low",    color: "text-slate-400" },
};

const PRIORITY_SORT: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const STATUS_SORT: Record<string, number> = {
  BLOCKED: 0, IN_PROGRESS: 1, REVISION_REQUIRED: 2, ASSIGNED: 3,
  WAITING_APPROVAL: 4, TODO: 5, COMPLETED: 6, CANCELLED: 7,
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SortIcon({ col, sortKey, dir }: { col: SortKey; sortKey: SortKey; dir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  return dir === "asc"
    ? <ChevronUp className="w-3 h-3 text-[#e8170b]" />
    : <ChevronDown className="w-3 h-3 text-[#e8170b]" />;
}

export function TableView({ tasks, canManage, onTaskClick, onDeleteTask, deletingTaskId }: TableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const sorted = [...tasks].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "title":   cmp = a.title.localeCompare(b.title); break;
      case "status":  cmp = (STATUS_SORT[a.status] ?? 99) - (STATUS_SORT[b.status] ?? 99); break;
      case "priority": cmp = (PRIORITY_SORT[a.priority] ?? 99) - (PRIORITY_SORT[b.priority] ?? 99); break;
      case "dueDate": cmp = (a.dueDate ?? "").localeCompare(b.dueDate ?? ""); break;
      case "startDate": cmp = (a.startDate ?? "").localeCompare(b.startDate ?? ""); break;
      case "estimatedHours": cmp = (a.estimatedHours ?? 0) - (b.estimatedHours ?? 0); break;
      case "assignees": cmp = a.assignees.length - b.assignees.length; break;
      case "subTasks": cmp = a._count.subTasks - b._count.subTasks; break;
      case "comments": cmp = a._count.comments - b._count.comments; break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  function Th({ label, col, className }: { label: string; col: SortKey; className?: string }) {
    return (
      <th
        className={cn("px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:text-foreground select-none whitespace-nowrap", className)}
        onClick={() => handleSort(col)}
      >
        <div className="flex items-center gap-1">
          {label}
          <SortIcon col={col} sortKey={sortKey} dir={sortDir} />
        </div>
      </th>
    );
  }

  const now = new Date();

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full">
        <thead className="sticky top-0 z-10">
          <tr className="bg-muted/50 border-b border-border backdrop-blur-sm">
            <Th label="Task Name"       col="title"          className="pl-5 min-w-[200px]" />
            <Th label="Status"          col="status"         className="min-w-[120px]" />
            <Th label="Priority"        col="priority"       className="min-w-[100px]" />
            <Th label="Assignees"       col="assignees"      className="min-w-[100px]" />
            <Th label="Due Date"        col="dueDate"        className="min-w-[120px]" />
            <Th label="Start Date"      col="startDate"      className="min-w-[120px]" />
            <Th label="Est. Hours"      col="estimatedHours" className="min-w-[100px]" />
            <Th label="Subtasks"        col="subTasks"       className="min-w-[80px]" />
            <Th label="Comments"        col="comments"       className="min-w-[80px]" />
            {canManage && <th className="px-3 py-2.5 w-10" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {sorted.map((task) => {
            const priCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG["MEDIUM"];
            const overdue = task.dueDate && new Date(task.dueDate) < now && task.status !== "COMPLETED";

            return (
              <tr
                key={task.id}
                onClick={() => onTaskClick(task.id)}
                className="hover:bg-muted/20 transition-colors cursor-pointer group"
              >
                <td className="px-5 py-2.5">
                  <p className="text-sm font-medium truncate max-w-[280px]">{task.title}</p>
                  {task.listName && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{task.listName}</p>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium", STATUS_BADGE[task.status] ?? "bg-muted text-muted-foreground")}>
                    {STATUS_LABEL[task.status] ?? task.status}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Flag className={cn("w-3 h-3 fill-current flex-shrink-0", priCfg.color)} />
                    <span className={cn("text-xs", priCfg.color)}>{priCfg.label}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <AvatarGroup users={task.assignees.map((a) => a.user)} max={4} />
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn("text-xs", overdue ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                    {fmtDate(task.dueDate)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(task.startDate)}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground text-center">
                  {task.estimatedHours != null ? `${task.estimatedHours}h` : "—"}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground text-center">{task._count.subTasks || "—"}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground text-center">{task._count.comments || "—"}</td>
                {canManage && (
                  <td className="px-3 py-2.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                      disabled={deletingTaskId === task.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 text-muted-foreground disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={canManage ? 10 : 9} className="px-5 py-12 text-center text-sm text-muted-foreground">
                No tasks found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
