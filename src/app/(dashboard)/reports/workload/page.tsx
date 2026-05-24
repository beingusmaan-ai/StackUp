"use client";

import { useQuery } from "@tanstack/react-query";
import { cn, getInitials } from "@/lib/utils";
import { WorkloadBarChart } from "@/components/reports/charts/WorkloadBarChart";
import { useUIStore } from "@/store/ui-store";

type WorkloadUser = {
  id: string;
  name: string;
  marketingRole: string | null;
  activeTasks: number;
  completedThisWeek: number;
  overdueTasks: number;
  urgentTasks: number;
  capacityPct: number;
  status: "healthy" | "busy" | "high" | "overloaded";
};

const STATUS_CONFIG = {
  healthy: { label: "Healthy", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-950/40" },
  busy: { label: "Busy", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-950/40" },
  high: { label: "High Load", color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-950/40" },
  overloaded: { label: "Overloaded", color: "text-red-600", bg: "bg-red-100 dark:bg-red-950/40" },
};

export default function WorkloadAnalyticsPage() {
  const { activeTeamId } = useUIStore();
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "workload", activeTeamId],
    queryFn: () => {
      const url = activeTeamId
        ? `/api/reports/workload?departmentId=${activeTeamId}`
        : "/api/reports/workload";
      return fetch(url).then((r) => r.json());
    },
    refetchInterval: 60_000,
  });

  const users: WorkloadUser[] = data?.data ?? [];
  const overloaded = users.filter((u) => u.status === "overloaded").length;
  const healthy = users.filter((u) => u.status === "healthy").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Workload Analytics</h1>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          {overloaded > 0 && <span className="text-red-500 font-medium">{overloaded} overloaded · </span>}
          {healthy} healthy · {users.length} total
        </p>
      </div>

      {/* Bar chart */}
      {!isLoading && users.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-[13px] font-semibold text-foreground mb-1">Capacity Overview</h3>
          <p className="text-[11px] text-muted-foreground mb-4">Active tasks as % of 10-task baseline. Red line = 100%.</p>
          <WorkloadBarChart data={users} />
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {[
              { label: "Healthy (0–50%)", color: "bg-emerald-500" },
              { label: "Busy (51–80%)", color: "bg-amber-500" },
              { label: "High Load (81–100%)", color: "bg-orange-500" },
              { label: "Overloaded (100%+)", color: "bg-red-500" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={cn("w-2 h-2 rounded-full", l.color)} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {users.map((u) => {
            const cfg = STATUS_CONFIG[u.status];
            const capCapped = Math.min(u.capacityPct, 100);
            const barColor = u.capacityPct > 100 ? "bg-red-500" : u.capacityPct > 80 ? "bg-orange-500" : u.capacityPct > 50 ? "bg-amber-500" : "bg-emerald-500";
            return (
              <div key={u.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#e8170b] flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                      {getInitials(u.name)}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-foreground leading-tight">{u.name}</p>
                      <p className="text-[11px] text-muted-foreground">{u.marketingRole?.replace(/_/g, " ") ?? "—"}</p>
                    </div>
                  </div>
                  <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", cfg.color, cfg.bg)}>
                    {cfg.label}
                  </span>
                </div>
                {/* Capacity bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="font-semibold text-foreground">{u.capacityPct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${capCapped}%` }} />
                  </div>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div>
                    <p className="text-[14px] font-bold text-foreground">{u.activeTasks}</p>
                    <p className="text-[10px] text-muted-foreground">Active</p>
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-emerald-600">{u.completedThisWeek}</p>
                    <p className="text-[10px] text-muted-foreground">Done/wk</p>
                  </div>
                  <div>
                    <p className={cn("text-[14px] font-bold", u.overdueTasks > 0 ? "text-red-500" : "text-muted-foreground")}>
                      {u.overdueTasks}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Overdue</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
