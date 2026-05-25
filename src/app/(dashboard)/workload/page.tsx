"use client";

import { useState, useMemo } from "react";
import { useUIStore } from "@/store/ui-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { format, isSameDay, isToday } from "date-fns";
import {
  Zap, Activity, AlertTriangle, TrendingUp, Clock,
  Search, Users, RefreshCw, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { WorkloadCard } from "@/components/workload/WorkloadCard";
import { WorkloadInsights } from "@/components/workload/WorkloadInsights";
import { WorkloadCharts } from "@/components/workload/WorkloadCharts";
import { WorkloadDrawer } from "@/components/workload/WorkloadDrawer";
import { useWorkloadStore } from "@/store/workload-store";
import { type WorkloadData } from "@/lib/workload";

function getWeekDays(): Date[] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function WorkloadPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const isAdmin = session?.user.role !== "TEAM_MEMBER";

  const {
    selectedUserId, setSelectedUserId,
    departmentFilter, setDepartmentFilter,
    statusFilter, setStatusFilter,
    searchQuery, setSearchQuery,
  } = useWorkloadStore();

  const { activeTeamId } = useUIStore();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading } = useQuery<WorkloadData>({
    queryKey: ["workload", activeTeamId],
    queryFn: async () => {
      const url = activeTeamId ? `/api/workload?teamId=${activeTeamId}` : "/api/workload";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load workload data");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  async function handleRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["workload"] });
    setTimeout(() => setRefreshing(false), 800);
  }

  const users = data?.users ?? [];
  const campaigns = data?.campaigns ?? [];
  const insights = data?.insights ?? [];
  const summary = data?.summary ?? { totalCapacity: 0, activeWorkload: 0, overloadedCount: 0, availableCapacity: 0, delayedTaskRisk: 0 };

  const departments = useMemo(
    () => [...new Set(users.map((u) => u.department).filter(Boolean) as string[])].sort(),
    [users]
  );

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (departmentFilter && u.department !== departmentFilter) return false;
      if (statusFilter && u.status !== statusFilter) return false;
      if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [users, departmentFilter, statusFilter, searchQuery]);

  const selectedUser = selectedUserId ? users.find((u) => u.id === selectedUserId) ?? null : null;

  const weekDays = useMemo(getWeekDays, []);

  const utilizationPct = summary.totalCapacity > 0
    ? Math.round((summary.activeWorkload / summary.totalCapacity) * 100)
    : 0;

  const stats = [
    {
      label: "Total Capacity",
      value: summary.totalCapacity,
      unit: "pts",
      sub: `${users.length} team members`,
      color: "border-t-[#4169e1]",
      iconColor: "text-[#4169e1]",
      Icon: Zap,
    },
    {
      label: "Active Workload",
      value: summary.activeWorkload,
      unit: "pts",
      sub: `${utilizationPct}% of total capacity`,
      color: "border-t-[#f59e0b]",
      iconColor: "text-[#f59e0b]",
      Icon: Activity,
    },
    {
      label: "Overloaded",
      value: summary.overloadedCount,
      unit: summary.overloadedCount === 1 ? "member" : "members",
      sub: "need immediate attention",
      color: summary.overloadedCount > 0 ? "border-t-[#e8170b]" : "border-t-[#10b981]",
      iconColor: summary.overloadedCount > 0 ? "text-[#e8170b]" : "text-[#10b981]",
      Icon: AlertTriangle,
    },
    {
      label: "Available Capacity",
      value: summary.availableCapacity,
      unit: "pts",
      sub: "free to accept tasks",
      color: "border-t-[#10b981]",
      iconColor: "text-[#10b981]",
      Icon: TrendingUp,
    },
    {
      label: "Tasks at Risk",
      value: summary.delayedTaskRisk,
      unit: summary.delayedTaskRisk === 1 ? "overdue" : "overdue",
      sub: "may affect projects",
      color: summary.delayedTaskRisk > 0 ? "border-t-[#f97316]" : "border-t-[#10b981]",
      iconColor: summary.delayedTaskRisk > 0 ? "text-[#f97316]" : "text-[#10b981]",
      Icon: Clock,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 w-40 bg-muted rounded-lg animate-pulse" />
            <div className="h-3.5 w-56 bg-muted rounded mt-1.5 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card border border-border border-t-4 border-t-muted rounded-xl p-4 animate-pulse">
              <div className="h-3 w-20 bg-muted rounded mb-2" />
              <div className="h-7 w-16 bg-muted rounded mb-1" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 h-36 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Team Workload</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Week of {format(weekDays[0], "MMM d")}–{format(weekDays[4], "d, yyyy")} · {users.length} team member{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 py-1.5 w-44">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              placeholder="Search member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-[13px] outline-none text-foreground placeholder:text-muted-foreground w-full"
            />
          </div>

          {/* Department filter */}
          {departments.length > 0 && (
            <div className="relative">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="appearance-none pl-2.5 pr-7 py-1.5 bg-card border border-border rounded-lg text-[12px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#e8170b] cursor-pointer"
              >
                <option value="">All Functions</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          )}

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-2.5 pr-7 py-1.5 bg-card border border-border rounded-lg text-[12px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#e8170b] cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="overloaded">🔴 Overloaded</option>
              <option value="high_load">🟠 High Load</option>
              <option value="busy">🟡 Busy</option>
              <option value="healthy">🟢 Healthy</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:border-[#e8170b]/30 transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={cn("bg-card border border-border border-t-[3px] rounded-xl p-4", s.color)}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight">{s.label}</p>
              <s.Icon className={cn("w-3.5 h-3.5 flex-shrink-0", s.iconColor)} />
            </div>
            <p className="text-[22px] font-bold text-foreground leading-none">
              {s.value}
              <span className="text-[12px] font-normal text-muted-foreground ml-1">{s.unit}</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Team grid + insights */}
      <div className="flex gap-5 items-start">
        {/* Team workload grid */}
        <div className="flex-1 min-w-0">
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center bg-card border border-border rounded-xl py-16 text-center">
              <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-[13px] font-medium text-foreground">No team members match filters</p>
              <button
                onClick={() => { setDepartmentFilter(""); setStatusFilter(""); setSearchQuery(""); }}
                className="mt-2 text-[12px] text-[#e8170b] hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredUsers.map((user) => (
                <WorkloadCard
                  key={user.id}
                  user={user}
                  onClick={() => setSelectedUserId(user.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Insights panel */}
        <div className="w-[272px] flex-shrink-0 hidden lg:block">
          <WorkloadInsights
            insights={insights}
            users={users}
            onUserClick={(id) => setSelectedUserId(id)}
          />
        </div>
      </div>

      {/* Weekly timeline */}
      {filteredUsers.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-semibold text-foreground">Weekly Timeline</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Tasks due this week per team member</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-100 dark:bg-emerald-900/50 inline-block" />1 task</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-100 dark:bg-amber-900/50 inline-block" />2 tasks</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-100 dark:bg-red-900/50 inline-block" />3+</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-muted-foreground w-40">Member</th>
                  {weekDays.map((d) => (
                    <th key={d.toISOString()} className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground text-center">
                      <div>{format(d, "EEE")}</div>
                      <div className={cn("text-[10px] font-normal", isToday(d) && "text-[#e8170b] font-bold")}>
                        {format(d, "d")}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground text-center">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={user.name} image={user.image} size="sm" />
                        <span className="text-[12px] font-medium text-foreground truncate">
                          {user.name.split(" ")[0]}
                        </span>
                      </div>
                    </td>
                    {weekDays.map((d) => {
                      const count = user.tasks.filter(
                        (t) => t.dueDate && isSameDay(new Date(t.dueDate), d)
                      ).length;
                      return (
                        <td key={d.toISOString()} className="px-3 py-2.5 text-center">
                          {count > 0 ? (
                            <span className={cn(
                              "inline-flex w-6 h-6 rounded-full text-[11px] font-bold items-center justify-center",
                              count >= 3
                                ? "bg-red-100 text-[#e8170b] dark:bg-red-950/40"
                                : count === 2
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            )}>
                              {count}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/25 text-[11px]">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-[12px] font-semibold text-foreground">{user.activeTasks}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts */}
      {users.length > 0 && (
        <WorkloadCharts users={filteredUsers.length > 0 ? filteredUsers : users} campaigns={campaigns} />
      )}

      {/* Employee drawer */}
      {selectedUser && (
        <WorkloadDrawer
          user={selectedUser}
          allUsers={users}
          onClose={() => setSelectedUserId(null)}
          onReassigned={() => {
            queryClient.invalidateQueries({ queryKey: ["workload"] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            setSelectedUserId(null);
          }}
        />
      )}
    </div>
  );
}
