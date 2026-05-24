"use client";

import { useState } from "react";
import { X, AlertTriangle, ArrowRight, ChevronDown, Briefcase, Clock } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { toast } from "sonner";
import {
  type UserWorkload, type TaskItem, STATUS_CONFIG, formatRole,
} from "@/lib/workload";

const PRIORITY_CONFIG: Record<string, { label: string; dotClass: string; bgClass: string }> = {
  LOW:    { label: "Low",    dotClass: "bg-gray-400",    bgClass: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  MEDIUM: { label: "Med",    dotClass: "bg-blue-500",    bgClass: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" },
  HIGH:   { label: "High",   dotClass: "bg-orange-500",  bgClass: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400" },
  URGENT: { label: "Urgent", dotClass: "bg-[#e8170b]",   bgClass: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400" },
};

interface Props {
  user: UserWorkload;
  allUsers: UserWorkload[];
  onClose: () => void;
  onReassigned: () => void;
}

export function WorkloadDrawer({ user, allUsers, onClose, onReassigned }: Props) {
  const [reassigningTask, setReassigningTask] = useState<TaskItem | null>(null);
  const [targetUserId, setTargetUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const cfg = STATUS_CONFIG[user.status];
  const otherUsers = allUsers.filter((u) => u.id !== user.id);

  const barPct = Math.min(user.capacityUsage, 100);

  async function handleReassign() {
    if (!reassigningTask || !targetUserId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${reassigningTask.id}/reassign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromUserId: user.id, toUserId: targetUserId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === "string" ? err.error : "Failed to reassign");
      }
      const target = allUsers.find((u) => u.id === targetUserId);
      toast.success(`Task moved to ${target?.name ?? "team member"}`);
      setReassigningTask(null);
      setTargetUserId("");
      onReassigned();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reassign task");
    } finally {
      setSaving(false);
    }
  }

  // Priority breakdown
  const byPriority = ["URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => ({
    priority: p,
    count: user.tasks.filter((t) => t.priority === p).length,
  })).filter((p) => p.count > 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-background border-l border-border w-full max-w-[480px] h-full flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <UserAvatar name={user.name} image={user.image} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-bold text-foreground">{user.name}</p>
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", cfg.badgeBg)}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-[12px] text-muted-foreground">{formatRole(user.marketingRole)}</p>
              {user.department && (
                <p className="text-[11px] text-muted-foreground/70">{user.department}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-0 border-b border-border flex-shrink-0">
          {[
            { label: "Active Tasks", value: user.activeTasks },
            { label: "Overdue", value: user.overdueTasks, red: user.overdueTasks > 0 },
            { label: "Workload", value: `${Math.round(user.capacityUsage)}%`, red: user.capacityUsage > 100 },
          ].map((s) => (
            <div key={s.label} className="px-4 py-3 text-center border-r border-border last:border-r-0">
              <p className={cn("text-[18px] font-bold", s.red ? "text-[#e8170b]" : "text-foreground")}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Capacity bar */}
        <div className="px-5 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5 text-[11px]">
            <span className="text-muted-foreground">{user.workloadScore} / {user.weeklyCapacity} pts used</span>
            <span className={cn("font-semibold", cfg.textClass)}>{Math.round(user.capacityUsage)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full", cfg.bgClass, user.status === "overloaded" && "animate-pulse")}
              style={{ width: `${barPct}%` }}
            />
          </div>
          {byPriority.length > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {byPriority.map(({ priority, count }) => (
                <span key={priority} className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", PRIORITY_CONFIG[priority]?.bgClass)}>
                  {PRIORITY_CONFIG[priority]?.label}: {count}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto">
          {user.tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-5">
              <Briefcase className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-[12px] text-muted-foreground">No active tasks assigned</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              <div className="px-5 py-2.5 bg-muted/20">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Tasks ({user.tasks.length})
                </p>
              </div>
              {user.tasks.map((task) => {
                const isReassigning = reassigningTask?.id === task.id;
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                const pcfg = PRIORITY_CONFIG[task.priority];

                return (
                  <div key={task.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <span className={cn("w-1.5 h-1.5 rounded-sm flex-shrink-0 mt-1.5", pcfg?.dotClass)} />
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-foreground truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {task.campaign && (
                              <span className="text-[10px] text-[#e8170b] font-medium">{task.campaign.name}</span>
                            )}
                            {task.dueDate && (
                              <span className={cn("flex items-center gap-0.5 text-[10px]", isOverdue ? "text-[#e8170b] font-medium" : "text-muted-foreground")}>
                                <Clock className="w-2.5 h-2.5" />
                                {formatDate(task.dueDate)}
                                {isOverdue && " · overdue"}
                              </span>
                            )}
                            {isOverdue && !task.dueDate && (
                              <span className="flex items-center gap-0.5 text-[10px] text-[#e8170b]">
                                <AlertTriangle className="w-2.5 h-2.5" /> overdue
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {!isReassigning && (
                        <button
                          onClick={() => { setReassigningTask(task); setTargetUserId(""); }}
                          className="flex-shrink-0 text-[10px] font-medium text-muted-foreground hover:text-[#e8170b] transition-colors border border-border hover:border-[#e8170b]/40 rounded px-2 py-0.5"
                        >
                          Reassign
                        </button>
                      )}
                    </div>

                    {/* Reassign form */}
                    {isReassigning && (
                      <div className="mt-2.5 flex items-center gap-2 pl-3.5">
                        <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <div className="relative flex-1">
                          <select
                            value={targetUserId}
                            onChange={(e) => setTargetUserId(e.target.value)}
                            disabled={saving}
                            className="w-full appearance-none pl-2.5 pr-7 py-1.5 text-[12px] border border-border bg-background rounded-lg focus:outline-none focus:ring-1 focus:ring-[#e8170b] cursor-pointer disabled:opacity-50"
                          >
                            <option value="">Select team member…</option>
                            {otherUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} — {Math.round(u.capacityUsage)}% capacity
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                        </div>
                        <button
                          onClick={handleReassign}
                          disabled={!targetUserId || saving}
                          className="flex-shrink-0 px-2.5 py-1.5 text-[11px] font-semibold bg-[#e8170b] text-white rounded-lg hover:bg-[#c91409] disabled:opacity-50 transition-colors"
                        >
                          {saving ? "…" : "Move"}
                        </button>
                        <button
                          onClick={() => { setReassigningTask(null); setTargetUserId(""); }}
                          disabled={saving}
                          className="flex-shrink-0 px-2 py-1.5 text-[11px] border border-border rounded-lg hover:bg-muted transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
