"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";

interface WorkloadUser {
  name: string;
  capacityPct: number;
  status: "healthy" | "busy" | "high" | "overloaded";
}

function barColor(status: string): string {
  switch (status) {
    case "healthy": return "#10b981";
    case "busy": return "#f59e0b";
    case "high": return "#f97316";
    case "overloaded": return "#ef4444";
    default: return "#94a3b8";
  }
}

export function WorkloadBarChart({ data }: { data: WorkloadUser[] }) {
  const chartData = data.map((u) => ({
    name: u.name.split(" ")[0],
    capacity: Math.min(u.capacityPct, 150),
    status: u.status,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 150]} unit="%" />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
          formatter={(v) => [`${v as number}%`, "Capacity"]}
        />
        <ReferenceLine y={100} stroke="#e8170b" strokeDasharray="4 4" strokeOpacity={0.5} />
        <Bar dataKey="capacity" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={barColor(entry.status)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
