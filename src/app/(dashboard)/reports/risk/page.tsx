"use client";

import { useQuery } from "@tanstack/react-query";
import { cn, formatDate } from "@/lib/utils";
import { AlertTriangle, Lightbulb, Clock } from "lucide-react";
import { useUIStore } from "@/store/ui-store";

type RiskItem = {
  campaignId: string;
  campaignName: string;
  deadline: string | null;
  daysRemaining: number | null;
  progress: number;
  totalTasks: number;
  pendingTasks: number;
  blockedTasks: number;
  overloadedAssignees: string[];
  riskLevel: "safe" | "watch" | "risk" | "critical";
  suggestions: string[];
};

const RISK_CONFIG = {
  safe: { label: "Safe", border: "border-emerald-200 dark:border-emerald-800", bg: "bg-emerald-50/50 dark:bg-emerald-950/10", badge: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40", icon: "text-emerald-500" },
  watch: { label: "Watch", border: "border-amber-200 dark:border-amber-800", bg: "bg-amber-50/50 dark:bg-amber-950/10", badge: "text-amber-600 bg-amber-100 dark:bg-amber-950/40", icon: "text-amber-500" },
  risk: { label: "Risk", border: "border-orange-200 dark:border-orange-800", bg: "bg-orange-50/50 dark:bg-orange-950/10", badge: "text-orange-600 bg-orange-100 dark:bg-orange-950/40", icon: "text-orange-500" },
  critical: { label: "Critical", border: "border-red-300 dark:border-red-800", bg: "bg-red-50/50 dark:bg-red-950/10", badge: "text-red-600 bg-red-100 dark:bg-red-950/40", icon: "text-red-500" },
};

const RISK_ORDER = { critical: 0, risk: 1, watch: 2, safe: 3 };

export default function RiskCenterPage() {
  const { activeTeamId } = useUIStore();
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "risk", activeTeamId],
    queryFn: () => {
      const url = activeTeamId
        ? `/api/reports/risk?departmentId=${activeTeamId}`
        : "/api/reports/risk";
      return fetch(url).then((r) => r.json());
    },
    refetchInterval: 60_000,
  });

  const items: RiskItem[] = (data?.data ?? []).sort(
    (a: RiskItem, b: RiskItem) => RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel]
  );

  const criticalCount = items.filter((i) => i.riskLevel === "critical").length;
  const riskCount = items.filter((i) => i.riskLevel === "risk").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Deadline Risk Center</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {criticalCount > 0 && <span className="text-red-500 font-medium">{criticalCount} critical · </span>}
            {riskCount > 0 && <span className="text-orange-500 font-medium">{riskCount} at risk · </span>}
            {items.length} campaigns tracked
          </p>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3">
        {(["critical", "risk", "watch", "safe"] as const).map((level) => {
          const cfg = RISK_CONFIG[level];
          const count = items.filter((i) => i.riskLevel === level).length;
          return (
            <div key={level} className={cn("border rounded-lg p-3 text-center", cfg.border, cfg.bg)}>
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <p className={cn("text-[11px] font-semibold mt-0.5", cfg.badge.split(" ")[0])}>{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg h-32 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-[13px] text-muted-foreground">
          No active campaigns found.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const cfg = RISK_CONFIG[item.riskLevel];
            return (
              <div key={item.campaignId} className={cn("border rounded-lg p-4", cfg.border, cfg.bg)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertTriangle className={cn("w-4 h-4 flex-shrink-0", cfg.icon)} />
                      <h3 className="text-[14px] font-semibold text-foreground">{item.campaignName}</h3>
                      <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", cfg.badge)}>
                        {cfg.label}
                      </span>
                    </div>
                    {/* Stats row */}
                    <div className="flex items-center gap-4 flex-wrap text-[12px] text-muted-foreground">
                      {item.deadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.daysRemaining !== null && item.daysRemaining < 0
                            ? <span className="text-red-500 font-medium">{Math.abs(item.daysRemaining)}d overdue</span>
                            : <span className={cn(item.daysRemaining !== null && item.daysRemaining <= 7 ? "text-orange-500 font-medium" : "")}>
                                {item.daysRemaining}d remaining
                              </span>}
                        </span>
                      )}
                      <span>{item.pendingTasks} tasks pending</span>
                      {item.blockedTasks > 0 && (
                        <span className="text-red-500">{item.blockedTasks} blocked</span>
                      )}
                      {item.overloadedAssignees.length > 0 && (
                        <span className="text-orange-500">{item.overloadedAssignees[0]} overloaded</span>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden max-w-xs">
                        <div
                          className={cn("h-full rounded-full", item.progress >= 80 ? "bg-emerald-500" : item.progress >= 50 ? "bg-amber-500" : "bg-red-500")}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground">{item.progress}% complete</span>
                    </div>
                  </div>
                  {/* Suggestions */}
                  {item.suggestions.length > 0 && (
                    <div className="flex-shrink-0 max-w-[220px]">
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" />
                        Suggestions
                      </p>
                      <ul className="space-y-1">
                        {item.suggestions.map((s, i) => (
                          <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                            <span className="mt-1 w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
