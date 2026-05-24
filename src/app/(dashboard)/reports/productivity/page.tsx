"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn, getInitials } from "@/lib/utils";
import { useReportsStore } from "@/store/reports-store";
import { ProductivityAreaChart } from "@/components/reports/charts/ProductivityAreaChart";
import { ProductivityAnomaliesPanel } from "@/components/reports/ProductivityAnomaliesPanel";
import { Download, Sparkles } from "lucide-react";
import { useUIStore } from "@/store/ui-store";

type UserStat = {
  id: string;
  name: string;
  marketingRole: string | null;
  completed: number;
  onTime: number;
  delayed: number;
  activeTasks: number;
  overdueTasks: number;
  avgCompletionDays: number;
  completionRate: number;
};

function exportCsv(users: UserStat[], range: string) {
  const headers = ["Name", "Role", "Completed", "On Time", "Delayed", "Active Tasks", "Overdue", "Avg Days", "Completion %"];
  const rows = users.map((u) => [
    u.name,
    u.marketingRole ?? "",
    u.completed,
    u.onTime,
    u.delayed,
    u.activeTasks,
    u.overdueTasks,
    u.avgCompletionDays,
    `${u.completionRate}%`,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `productivity-report-${range}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProductivityPage() {
  const { activeTeamId } = useUIStore();
  const { dateRange, setDateRange } = useReportsStore();
  const [showAnomalies, setShowAnomalies] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "productivity", dateRange, activeTeamId],
    queryFn: () => {
      const params = new URLSearchParams({ range: dateRange });
      if (activeTeamId) params.set("departmentId", activeTeamId);
      return fetch(`/api/reports/productivity?${params}`).then((r) => r.json());
    },
    refetchInterval: 60_000,
  });

  const users: UserStat[] = data?.data ?? [];
  const trend: { date: string; completed: number }[] = data?.trend ?? [];
  const totalCompleted = users.reduce((sum, u) => sum + u.completed, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Productivity Reports</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {totalCompleted} tasks completed in selected period
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Range selector */}
          <div className="flex items-center gap-0.5 bg-card border border-border rounded-md p-0.5">
            {(["today", "week", "month"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={cn(
                  "px-3 py-1.5 rounded text-[12px] font-medium transition-colors capitalize",
                  dateRange === r ? "bg-[#e8170b] text-white" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r === "today" ? "Today" : r === "week" ? "This Week" : "This Month"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAnomalies(true)}
            disabled={isLoading || users.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-[12px] text-violet-600 hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/20 disabled:opacity-40 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Anomalies
          </button>
          <button
            onClick={() => exportCsv(users, dateRange)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:border-[#e8170b]/40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Anomalies panel */}
      {showAnomalies && (
        <ProductivityAnomaliesPanel
          users={users}
          dateRange={dateRange}
          onClose={() => setShowAnomalies(false)}
        />
      )}

      {/* Trend chart */}
      {!isLoading && trend.length > 1 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-[13px] font-semibold text-foreground mb-1">Team Completion Trend</h3>
          <p className="text-[11px] text-muted-foreground mb-4">Total tasks completed per day</p>
          <ProductivityAreaChart data={trend} />
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div
          className="grid text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border bg-muted/40"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr" }}
        >
          {["Member", "Completed", "On Time", "Delayed", "Active", "Avg Days", "Rate"].map((h) => (
            <div key={h} className="px-4 py-2.5">{h}</div>
          ))}
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-5 h-5 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-muted-foreground">No data available.</div>
        ) : (
          <div className="divide-y divide-border">
            {users.sort((a, b) => b.completed - a.completed).map((u) => (
              <div
                key={u.id}
                className="grid items-center hover:bg-muted/20 transition-colors"
                style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr" }}
              >
                <div className="px-4 py-3 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#e8170b] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                    {getInitials(u.name)}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{u.name}</p>
                    <p className="text-[11px] text-muted-foreground">{u.marketingRole?.replace(/_/g, " ") ?? "—"}</p>
                  </div>
                </div>
                <div className="px-4 py-3 text-[13px] font-semibold text-foreground">{u.completed}</div>
                <div className="px-4 py-3 text-[13px] text-emerald-600">{u.onTime}</div>
                <div className={cn("px-4 py-3 text-[13px]", u.delayed > 0 ? "text-red-500 font-medium" : "text-muted-foreground")}>
                  {u.delayed}
                </div>
                <div className="px-4 py-3 text-[13px] text-muted-foreground">{u.activeTasks}</div>
                <div className="px-4 py-3 text-[13px] text-muted-foreground">{u.avgCompletionDays}d</div>
                <div className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", u.completionRate >= 70 ? "bg-emerald-500" : u.completionRate >= 40 ? "bg-amber-500" : "bg-red-500")}
                        style={{ width: `${u.completionRate}%` }}
                      />
                    </div>
                    <span className="text-[12px] font-medium text-foreground">{u.completionRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
