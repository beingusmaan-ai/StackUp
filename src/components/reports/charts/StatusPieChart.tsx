"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  "TODO": "#94a3b8",
  "ASSIGNED": "#4169e1",
  "IN PROGRESS": "#f59e0b",
  "WAITING APPROVAL": "#8b5cf6",
  "REVISION REQUIRED": "#f97316",
  "COMPLETED": "#10b981",
  "BLOCKED": "#ef4444",
};

function getColor(status: string): string {
  return STATUS_COLORS[status.toUpperCase()] ?? "#94a3b8";
}

interface DataPoint {
  status: string;
  count: number;
}

export function StatusPieChart({ data }: { data: DataPoint[] }) {
  const filtered = data.filter((d) => d.count > 0);
  if (filtered.length === 0) return (
    <div className="flex items-center justify-center h-[200px] text-[12px] text-muted-foreground">No data</div>
  );

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={filtered}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={2}
          dataKey="count"
          nameKey="status"
        >
          {filtered.map((entry, index) => (
            <Cell key={index} fill={getColor(entry.status)} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
          formatter={(value, name) => [value as number, name as string]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value) => <span style={{ color: "hsl(var(--muted-foreground))" }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
