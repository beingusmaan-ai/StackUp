"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CheckSquare, TrendingUp, AlertTriangle, Megaphone,
  Users, Clock, BarChart3, AlertCircle,
} from "lucide-react";
import { KPICard } from "@/components/reports/KPICard";
import { InsightsPanel } from "@/components/reports/InsightsPanel";
import { CompletionTrendChart } from "@/components/reports/charts/CompletionTrendChart";
import { StatusPieChart } from "@/components/reports/charts/StatusPieChart";
import { ExecutiveSummaryPanel } from "@/components/reports/ExecutiveSummaryPanel";
import { useUIStore } from "@/store/ui-store";

export default function ExecutiveDashboard() {
  const { activeTeamId } = useUIStore();
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "dashboard", activeTeamId],
    queryFn: () => {
      const url = activeTeamId
        ? `/api/reports/dashboard?departmentId=${activeTeamId}`
        : "/api/reports/dashboard";
      return fetch(url).then((r) => r.json());
    },
    refetchInterval: 60_000,
  });

  if (isLoading) return <DashboardSkeleton />;

  const { kpis, completionTrend, statusBreakdown, insights } = data ?? {};

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Executive Dashboard</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Real-time team & campaign overview</p>
        </div>
        <ExecutiveSummaryPanel kpis={kpis ?? {}} insights={insights ?? []} />
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Active Tasks"
          value={kpis?.activeTasks?.value ?? 0}
          trend={kpis?.activeTasks?.trend}
          icon={CheckSquare}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-950/30"
        />
        <KPICard
          label="Completed This Week"
          value={kpis?.completedThisWeek?.value ?? 0}
          trend={kpis?.completedThisWeek?.trend}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 dark:bg-emerald-950/30"
        />
        <KPICard
          label="Overdue Tasks"
          value={kpis?.overdueTasks?.value ?? 0}
          trend={kpis?.overdueTasks?.trend}
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBg="bg-red-50 dark:bg-red-950/30"
          invertTrend
        />
        <KPICard
          label="Active Projects"
          value={kpis?.activeCampaigns?.value ?? 0}
          trend={kpis?.activeCampaigns?.trend}
          icon={Megaphone}
          iconColor="text-purple-600"
          iconBg="bg-purple-50 dark:bg-purple-950/30"
        />
        <KPICard
          label="Team Capacity"
          value={kpis?.teamCapacity?.value ?? 0}
          trend={kpis?.teamCapacity?.trend}
          icon={Users}
          iconColor="text-amber-600"
          iconBg="bg-amber-50 dark:bg-amber-950/30"
          suffix="%"
        />
        <KPICard
          label="Deadlines At Risk"
          value={kpis?.deadlinesAtRisk?.value ?? 0}
          trend={kpis?.deadlinesAtRisk?.trend}
          icon={Clock}
          iconColor="text-orange-600"
          iconBg="bg-orange-50 dark:bg-orange-950/30"
          invertTrend
        />
        <KPICard
          label="Pending Approval"
          value={kpis?.approvalPending?.value ?? 0}
          trend={kpis?.approvalPending?.trend}
          icon={AlertCircle}
          iconColor="text-violet-600"
          iconBg="bg-violet-50 dark:bg-violet-950/30"
          invertTrend
        />
        <KPICard
          label="Reports"
          value="View All"
          icon={BarChart3}
          iconColor="text-gray-500"
          iconBg="bg-gray-100 dark:bg-gray-800"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-[13px] font-semibold text-foreground mb-1">Task Completion Trend</h3>
          <p className="text-[11px] text-muted-foreground mb-4">Tasks completed per day (last 7 days)</p>
          <CompletionTrendChart data={completionTrend ?? []} />
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-[13px] font-semibold text-foreground mb-1">Task Status Breakdown</h3>
          <p className="text-[11px] text-muted-foreground mb-2">Distribution across all active tasks</p>
          <StatusPieChart data={statusBreakdown ?? []} />
        </div>
      </div>

      {/* Insights */}
      <InsightsPanel insights={insights ?? []} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-6 bg-muted rounded w-48 animate-pulse" />
        <div className="h-4 bg-muted rounded w-64 mt-1 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 h-28 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 h-64 animate-pulse" />
        <div className="bg-card border border-border rounded-lg p-4 h-64 animate-pulse" />
      </div>
    </div>
  );
}
