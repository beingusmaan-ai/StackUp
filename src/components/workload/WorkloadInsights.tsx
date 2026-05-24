"use client";

import { AlertTriangle, Lightbulb, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { type WorkloadInsight, type UserWorkload, STATUS_CONFIG } from "@/lib/workload";

interface Props {
  insights: WorkloadInsight[];
  users: UserWorkload[];
  onUserClick: (id: string) => void;
}

export function WorkloadInsights({ insights, users, onUserClick }: Props) {
  if (insights.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-[#e8170b]" />
          <h3 className="text-[13px] font-semibold text-foreground">Smart Insights</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-[12px] font-medium text-foreground">Team is balanced</p>
          <p className="text-[11px] text-muted-foreground mt-1">No workload issues detected</p>
        </div>
      </div>
    );
  }

  const warnings = insights.filter((i) => i.type === "warning");
  const suggestions = insights.filter((i) => i.type === "suggestion");

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
        <Lightbulb className="w-4 h-4 text-[#e8170b]" />
        <h3 className="text-[13px] font-semibold text-foreground">Smart Insights</h3>
        <span className="ml-auto text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
          {insights.length}
        </span>
      </div>

      <div className="p-4 space-y-3 max-h-[460px] overflow-y-auto">
        {warnings.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Action Required</p>
            {warnings.map((insight, i) => {
              const user = insight.userId ? users.find((u) => u.id === insight.userId) : null;
              return (
                <button
                  key={i}
                  onClick={() => insight.userId && onUserClick(insight.userId)}
                  className="w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 hover:border-[#e8170b]/40 transition-colors group"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-[#e8170b] flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    {user && (
                      <p className="text-[11px] font-semibold text-foreground mb-0.5 flex items-center gap-1.5">
                        {user.name}
                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-semibold", STATUS_CONFIG[user.status].badgeBg)}>
                          {STATUS_CONFIG[user.status].label}
                        </span>
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{insight.message}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">Recommendations</p>
            {suggestions.map((insight, i) => {
              const user = insight.userId ? users.find((u) => u.id === insight.userId) : null;
              return (
                <button
                  key={i}
                  onClick={() => insight.userId && onUserClick(insight.userId)}
                  className="w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-400/40 transition-colors"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    {user && (
                      <p className="text-[11px] font-semibold text-foreground mb-0.5">{user.name}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{insight.message}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
