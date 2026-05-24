"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  TODO:              { label: "To Do",           color: "#a0a0b0" },
  ASSIGNED:          { label: "Assigned",         color: "#4169e1" },
  IN_PROGRESS:       { label: "In Progress",      color: "#f59e0b" },
  WAITING_APPROVAL:  { label: "Waiting Approval", color: "#8b5cf6" },
  REVISION_REQUIRED: { label: "Revision",         color: "#f97316" },
  COMPLETED:         { label: "Completed",        color: "#10b981" },
  BLOCKED:           { label: "Blocked",          color: "#ef4444" },
};

interface TaskStatusChartProps {
  data: { status: string; count: number }[];
}

export function TaskStatusChart({ data }: TaskStatusChartProps) {
  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({
      name: STATUS_CONFIG[d.status]?.label ?? d.status,
      value: d.count,
      color: STATUS_CONFIG[d.status]?.color ?? "#a0a0b0",
      status: d.status,
    }));

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[14px] font-bold text-foreground">Tasks by Status</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{total} total tasks</p>
        </div>
        <span className="text-[11px] text-muted-foreground bg-muted px-2.5 py-1 rounded-full">{total} total</span>
      </div>

      {total === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center gap-2">
          <div className="w-16 h-16 rounded-full border-4 border-dashed border-border" />
          <p className="text-[12px] text-muted-foreground">No tasks yet</p>
        </div>
      ) : (
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%" cy="50%"
                  innerRadius={44} outerRadius={66}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "11px", padding: "6px 10px" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-foreground">{total}</span>
              <span className="text-[10px] text-muted-foreground">tasks</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {chartData.map((d) => (
              <div key={d.status} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-[12px] text-muted-foreground flex-1 truncate">{d.name}</span>
                <span className="text-[12px] font-semibold text-foreground">{d.value}</span>
                <span className="text-[10px] text-muted-foreground w-7 text-right">{Math.round((d.value / total) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
