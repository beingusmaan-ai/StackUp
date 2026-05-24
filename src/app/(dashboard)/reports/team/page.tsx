"use client";

import { useQuery } from "@tanstack/react-query";
import { cn, getInitials } from "@/lib/utils";
import { WorkloadBarChart } from "@/components/reports/charts/WorkloadBarChart";
import { useUIStore } from "@/store/ui-store";

type WorkloadUser = {
  id: string;
  name: string;
  image: string | null;
  marketingRole: string | null;
  activeTasks: number;
  completedThisWeek: number;
  overdueTasks: number;
  urgentTasks: number;
  capacityPct: number;
  status: "healthy" | "busy" | "high" | "overloaded";
};

const STATUS_CONFIG = {
  healthy: { label: "Healthy", dot: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  busy: { label: "Busy", dot: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  high: { label: "High Load", dot: "bg-orange-500", text: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
  overloaded: { label: "Overloaded", dot: "bg-red-500", text: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
};

function CapacityBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100);
  const color = pct > 100 ? "bg-red-500" : pct > 80 ? "bg-orange-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${capped}%` }} />
      </div>
      <span className="text-[11px] font-medium text-muted-foreground w-10 text-right">{pct}%</span>
    </div>
  );
}

export default function TeamReportsPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Team Reports</h1>
        <p className="text-[12px] text-muted-foreground mt-0.5">{users.length} active team members</p>
      </div>

      {/* Chart */}
      {!isLoading && users.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-[13px] font-semibold text-foreground mb-1">Team Workload Distribution</h3>
          <p className="text-[11px] text-muted-foreground mb-4">Capacity % per team member (dashed line = 100%)</p>
          <WorkloadBarChart data={users} />
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div
          className="grid text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border bg-muted/40"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.5fr" }}
        >
          {["Employee", "Active", "Done / Wk", "Overdue", "Urgent", "Capacity"].map((h) => (
            <div key={h} className="px-4 py-2.5">{h}</div>
          ))}
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-5 h-5 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-muted-foreground">No team members found.</div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((u) => {
              const cfg = STATUS_CONFIG[u.status];
              return (
                <div
                  key={u.id}
                  className="grid items-center hover:bg-muted/20 transition-colors"
                  style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.5fr" }}
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
                  <div className="px-4 py-3 text-[13px] font-medium text-foreground">{u.activeTasks}</div>
                  <div className="px-4 py-3 text-[13px] text-emerald-600 font-medium">{u.completedThisWeek}</div>
                  <div className={cn("px-4 py-3 text-[13px] font-medium", u.overdueTasks > 0 ? "text-red-500" : "text-muted-foreground")}>
                    {u.overdueTasks}
                  </div>
                  <div className={cn("px-4 py-3 text-[13px] font-medium", u.urgentTasks > 0 ? "text-orange-500" : "text-muted-foreground")}>
                    {u.urgentTasks}
                  </div>
                  <div className="px-4 py-3">
                    <CapacityBar pct={u.capacityPct} />
                    <span className={cn("text-[10px] font-medium mt-0.5 inline-flex items-center gap-1", cfg.text)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full inline-block", cfg.dot)} />
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
