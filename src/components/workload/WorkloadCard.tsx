"use client";

import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { AlertTriangle, CheckSquare } from "lucide-react";
import { type UserWorkload, STATUS_CONFIG, formatRole } from "@/lib/workload";

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-gray-400",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-[#e8170b]",
};

export function WorkloadCard({ user, onClick }: { user: UserWorkload; onClick: () => void }) {
  const cfg = STATUS_CONFIG[user.status];
  const barPct = Math.min(user.capacityUsage, 100);
  const isOverloaded = user.status === "overloaded";
  const isHighLoad = user.status === "high_load";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left bg-card border rounded-xl p-4 transition-all duration-200 group",
        "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8170b]",
        isOverloaded
          ? "border-[#e8170b]/40 ring-1 ring-[#e8170b]/20"
          : "border-border hover:border-[#e8170b]/20"
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex-shrink-0">
            <UserAvatar name={user.name} image={user.image} size="md" />
            {isOverloaded && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#e8170b] rounded-full border-2 border-background" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate group-hover:text-[#e8170b] transition-colors">
              {user.name}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{formatRole(user.marketingRole)}</p>
          </div>
        </div>
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0", cfg.badgeBg)}>
          {cfg.label}
        </span>
      </div>

      {/* Workload bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground">{user.workloadScore} / {user.weeklyCapacity} pts</span>
          <span className={cn("text-[12px] font-bold", isOverloaded ? "text-[#e8170b]" : isHighLoad ? "text-orange-500" : "text-foreground")}>
            {Math.round(user.capacityUsage)}%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              cfg.bgClass,
              isOverloaded && "animate-pulse"
            )}
            style={{ width: `${barPct}%` }}
          />
        </div>
        {isOverloaded && (
          <p className="text-[10px] text-[#e8170b] mt-1 font-medium">
            Capacity exceeded by {Math.round(user.capacityUsage - 100)}%
          </p>
        )}
      </div>

      {/* Bottom stats */}
      <div className="flex items-center gap-3 text-[11px]">
        <span className="flex items-center gap-1 text-muted-foreground">
          <CheckSquare className="w-3 h-3" />
          {user.activeTasks} active
        </span>
        {user.overdueTasks > 0 && (
          <span className="flex items-center gap-1 text-[#e8170b] font-medium">
            <AlertTriangle className="w-3 h-3" />
            {user.overdueTasks} overdue
          </span>
        )}
        <span className="ml-auto text-[11px]">
          {user.remainingPoints >= 0 ? (
            <span className="text-muted-foreground">{user.remainingPoints} pts free</span>
          ) : (
            <span className="text-[#e8170b] font-medium">{Math.abs(user.remainingPoints)} pts over</span>
          )}
        </span>
      </div>

      {/* Top 3 tasks preview */}
      {user.tasks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/60 space-y-1">
          {user.tasks.slice(0, 3).map((t) => (
            <div key={t.id} className="flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-sm flex-shrink-0", PRIORITY_DOT[t.priority] ?? "bg-gray-400")} />
              <span className="text-[11px] text-muted-foreground truncate">{t.title}</span>
            </div>
          ))}
          {user.tasks.length > 3 && (
            <p className="text-[10px] text-muted-foreground/60 pl-3">+{user.tasks.length - 3} more tasks</p>
          )}
        </div>
      )}
    </button>
  );
}
